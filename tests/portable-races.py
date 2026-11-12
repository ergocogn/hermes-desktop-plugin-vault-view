"""Synthetic directory-swap and special-file regressions for note delivery."""
import importlib.util
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("delivery", Path(__file__).resolve().parents[1] / "__init__.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

for attack in ("directory_symlink", "fifo"):
    with tempfile.TemporaryDirectory(prefix="vault-view-race-") as temporary:
        base = Path(temporary)
        root = base / "ExampleVault"
        (root / ".obsidian").mkdir(parents=True)
        (root / "Notes").mkdir()
        note = root / "Notes" / "Example.md"
        note.write_text("inside synthetic vault")
        outside = base / "outside"
        outside.mkdir()
        (outside / "Example.md").write_text("outside synthetic vault")
        original_open = os.open
        attacked = False
        def swap(path, flags, *args, **kwargs):
            global attacked
            if not attacked:
                if attack == "directory_symlink" and (Path(path) == note or (path == "Notes" and kwargs.get("dir_fd") is not None)):
                    attacked = True
                    (root / "Notes").rename(root / "OriginalNotes")
                    (root / "Notes").symlink_to(outside, target_is_directory=True)
                elif attack == "fifo" and (Path(path) == note or (path == "Example.md" and kwargs.get("dir_fd") is not None)):
                    attacked = True
                    note.unlink()
                    os.mkfifo(note)
            return original_open(path, flags, *args, **kwargs)
        descriptors = Path("/proc/self/fd")
        before = len(list(descriptors.iterdir())) if descriptors.is_dir() else None
        with patch.object(Path, "home", return_value=base), patch.dict(os.environ, {"WIKI_PATH": str(root), "HERMES_HOME": str(base / ".hermes")}), patch.object(module.os, "open", side_effect=swap):
            result = json.loads(module.present_note({"path": "Notes/Example.md"}))
        assert attacked, attack
        assert result["success"] is False, (attack, result)
        assert not list((base / ".hermes").glob("cache/documents/vault-view/note-*")), "rejected input must stage no attachment"
        if before is not None:
            assert len(list(descriptors.iterdir())) == before, "rejected reads must close descriptors"

print("PASS: directory symlink swaps and FIFO replacement fail closed without attachment or descriptor leaks")

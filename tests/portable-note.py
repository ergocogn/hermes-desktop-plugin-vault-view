"""Synthetic POSIX regression checks for the optional agent delivery tool."""

import importlib.util
import json
import os
from pathlib import Path
import tempfile
from unittest.mock import patch


source = Path(__file__).resolve().parents[1] / "__init__.py"
spec = importlib.util.spec_from_file_location("vault_view_agent", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Context:
    def __init__(self):
        self.registration = None

    def register_tool(self, **kwargs):
        self.registration = kwargs


context = Context()
module.register(context)
assert context.registration["name"] == module.TOOL_NAME
assert context.registration["schema"]["name"] == module.TOOL_NAME
assert context.registration["handler"] is module.present_note

with tempfile.TemporaryDirectory(prefix="vault-view-portable-") as temp:
    root = Path(temp) / "ExampleVault"
    (root / ".obsidian").mkdir(parents=True)
    (root / "Notes").mkdir()
    note = root / "Notes" / "Résumé été.md"
    note.write_text("# Synthetic note\n", encoding="utf-8")
    outside = Path(temp) / "outside.md"
    outside.write_text("not in vault", encoding="utf-8")
    (root / "Notes" / "escape.md").symlink_to(outside)
    previous = os.environ.get("WIKI_PATH")
    os.environ["WIKI_PATH"] = str(root / "Notes")
    try:
      with patch.object(Path, "home", return_value=Path(temp)), patch.dict(os.environ, {"HERMES_HOME": str(Path(temp) / ".hermes")}):
        valid = json.loads(module.present_note({"path": "Notes/Résumé été.md"}))
        delivered = Path(valid["file"])
        assert valid["success"] is True
        assert delivered != note.resolve()
        assert delivered.name == "Resume-ete.md"
        assert not any(char.isspace() for char in valid["file"])
        assert delivered.read_bytes() == note.read_bytes()
        assert delivered.stat().st_mode & 0o777 == 0o600
        assert valid["vault"] == root.name
        assert valid["path"] == "Notes/Résumé été.md"
        assert valid["media"] == "MEDIA:" + str(delivered)
        again = json.loads(module.present_note({"path": "Notes/Résumé été.md"}))
        assert again["file"] != valid["file"], "each delivery has its own producer path"
        for bad in ("../outside.md", "/tmp/outside.md", "Notes/escape.md", "Notes/missing.md",
                    "Notes/%2e%2e.md", "Notes\\x.md", ".obsidian/config.md", "Notes/a\n.md"):
            assert json.loads(module.present_note({"path": bad}))["success"] is False, bad
        assert note.read_text(encoding="utf-8") == "# Synthetic note\n"
        config = Path(temp) / ".hermes" / "vault-view-root.json"
        config.parent.mkdir(exist_ok=True)
        config.write_text(json.dumps({"vaultPath": str(root)}), encoding="utf-8")
        del os.environ["WIKI_PATH"]
        assert json.loads(module.present_note({"path": "Notes/Résumé été.md"}))["success"] is True
        config.unlink()
        assert json.loads(module.present_note({"path": "Notes/Résumé été.md"}))["error"] == "vault_unavailable"
    finally:
        if previous is None:
            os.environ.pop("WIKI_PATH", None)
        else:
            os.environ["WIKI_PATH"] = previous

print("PASS: portable note tool registers; emits a contained MEDIA path; rejects invalid and escaping notes")

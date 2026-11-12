"""Optional agent half for portable, explicit Vault View note delivery.

The Desktop plugin remains usable on its own. When this package is installed
and enabled on the gateway, the agent can present an existing Markdown note
as an ordinary Hermes file attachment on every client.
"""

from __future__ import annotations

import json
import os
import tempfile
import re
import unicodedata
import stat
from pathlib import Path


TOOL_NAME = "vault_view_present_note"
SCHEMA = {
    "name": TOOL_NAME,
    "description": (
        "Prepare an existing note in the configured Obsidian vault for explicit delivery to the user. "
        "Use only when the user asks to see or download that note, never for background reads. "
        "After success, put the returned MEDIA tag on its own line in the assistant reply so all Hermes clients receive a file card. Never substitute an obsidian:// link. "
        "Do not add a ::vault-note directive alongside the MEDIA tag: Desktop already turns this attachment into its Vault View card, while other clients display that directive as raw text. "
        "Prépare une note existante du vault Obsidian configuré pour un envoi demandé par l’utilisateur. "
        "Ne pas utiliser pour une lecture en arrière-plan. Après réussite, insérer le tag MEDIA renvoyé sur sa propre ligne dans la réponse. Ne jamais le remplacer par un lien obsidian://. Ne pas ajouter de directive ::vault-note : Desktop transforme déjà cette pièce jointe en carte Vault View, tandis que les autres clients affichent cette directive en texte brut."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Exact vault-relative .md path / Chemin .md exact relatif au vault",
            }
        },
        "required": ["path"],
    },
}


def _relative_note(raw: object) -> tuple[str, ...] | None:
    if not isinstance(raw, str) or not raw or len(raw) > 1024 or not raw.endswith(".md"):
        return None
    if raw.startswith("/") or any(ord(char) < 32 or ord(char) == 127 or char in "\\:%" for char in raw):
        return None
    parts = tuple(raw.split("/"))
    if any(part in {"", ".", "..", ".obsidian", ".trash", "node_modules"} for part in parts):
        return None
    return parts


def _configured_root() -> Path | None:
    # The existing Desktop transport supports Unix/WSL gateways, not a native
    # Windows filesystem gateway with different path and shell semantics.
    if os.name != "posix":
        return None
    candidate = ""
    try:
        config = Path.home() / ".hermes" / "vault-view-root.json"
        if config.is_file():
            value = json.loads(config.read_text(encoding="utf-8"))
            if isinstance(value, dict) and isinstance(value.get("vaultPath"), str):
                candidate = value["vaultPath"].strip()
    except (OSError, ValueError):
        pass
    if not candidate:
        candidate = os.environ.get("WIKI_PATH", "").strip()
    if not candidate or not Path(candidate).is_absolute():
        return None
    path = Path(candidate)
    for _ in range(13):
        if (path / ".obsidian").is_dir():
            return path.resolve(strict=True)
        if path.parent == path:
            break
        path = path.parent
    return None


def present_note(params: object, **_kwargs: object) -> str:
    """Stage an explicitly requested immutable attachment; preserve the note source."""
    parts = _relative_note(params.get("path") if isinstance(params, dict) else None)
    if not parts:
        return json.dumps({"success": False, "error": "invalid_path"})
    root = _configured_root()
    if root is None:
        return json.dumps({"success": False, "error": "vault_unavailable"})
    try:
        target = root.joinpath(*parts).resolve(strict=True)
        if not target.is_file() or not target.is_relative_to(root):
            raise ValueError("not a contained note")
    except (OSError, RuntimeError, ValueError):
        return json.dumps({"success": False, "error": "note_unavailable"})
    try:
        # Anchor every lookup to opened directories. A pathname-only resolve
        # followed by open() can escape if an intermediate directory is swapped
        # for a symlink after validation. The canonical target may still refer
        # to an in-vault symlink, but each actual opened component must be real.
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        parent_fd = os.open(root, directory_flags)
        try:
            for part in target.relative_to(root).parts[:-1]:
                child_fd = os.open(part, directory_flags, dir_fd=parent_fd)
                os.close(parent_fd)
                parent_fd = child_fd
            descriptor = os.open(target.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent_fd)
            with os.fdopen(descriptor, "rb") as source:
                revision = os.fstat(source.fileno())
                if not stat.S_ISREG(revision.st_mode):
                    return json.dumps({"success": False, "error": "note_unavailable"})
                data = source.read(32 * 1024 * 1024 + 1)
            if len(data) > 32 * 1024 * 1024:
                return json.dumps({"success": False, "error": "note_too_large"})
            current = os.stat(target.name, dir_fd=parent_fd, follow_symlinks=False)
        finally:
            os.close(parent_fd)
        if (revision.st_dev, revision.st_ino, revision.st_mtime_ns, revision.st_size) != (current.st_dev, current.st_ino, current.st_mtime_ns, current.st_size):
            return json.dumps({"success": False, "error": "note_changed"})
        home = Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes")
        cache = home / "cache" / "documents" / "vault-view"
        cache.mkdir(mode=0o700, parents=True, exist_ok=True)
        folder = Path(tempfile.mkdtemp(prefix="note-", dir=cache))
        # MEDIA consumers need one unambiguous path token. Keep every title
        # word while avoiding whitespace and URL/Markdown punctuation.
        stem = unicodedata.normalize("NFKD", target.stem).encode("ascii", "ignore").decode()
        stem = re.sub(r"[^A-Za-z0-9_-]+", "-", stem).strip("-_") or "note"
        delivery = folder / (stem + ".md")
        try:
            with delivery.open("xb") as output:
                os.chmod(delivery, 0o600)
                output.write(data)
        except OSError:
            delivery.unlink(missing_ok=True)
            folder.rmdir()
            raise
    except OSError:
        return json.dumps({"success": False, "error": "attachment_unavailable"})
    file_path = str(delivery)
    return json.dumps({
        "success": True,
        "file": file_path,
        "vault": root.name,
        "path": "/".join(parts),
        "media": "MEDIA:" + file_path,
        "delivery_instructions": {
            "en": "Include the media value exactly once on its own line in the reply. Do not add a ::vault-note directive or an Obsidian link, even if another guide recommends it: this attachment already provides the Desktop Vault View card and the native file card on other clients.",
            "fr": "Insère la valeur media exactement une fois sur sa propre ligne dans la réponse. N’ajoute ni directive ::vault-note ni lien Obsidian, même si un autre guide le recommande : cette pièce jointe fournit déjà la carte Vault View sur Desktop et la carte de fichier native sur les autres clients.",
        },
    }, ensure_ascii=False)


def register(ctx: object) -> None:
    ctx.register_tool(name=TOOL_NAME, toolset="vault_view", schema=SCHEMA, handler=present_note)

# Validation Summary: How to Use pathlib for File Paths in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (3.4+)
- `pathlib` module (`Path`, `PurePosixPath`, `PureWindowsPath`)
- `os.path` (comparison)
- `tempfile` module (in atomic-write example)
- `shutil` module (for file copy)

## Sources Consulted
- Python `pathlib` documentation: https://docs.python.org/3/library/pathlib.html
- Python `os.path` documentation: https://docs.python.org/3/library/os.path.html
- Python `tempfile.mkstemp` documentation: https://docs.python.org/3/library/tempfile.html#tempfile.mkstemp
- Python `shutil` documentation: https://docs.python.org/3/library/shutil.html
- Cross-checked behavior empirically via `python3` (`PureWindowsPath`, `PurePosixPath` outputs for `drive`, `root`, `anchor`, `parts`, `match`, `with_name`, `with_suffix`, `with_stem`, `relative_to`).

## Issues Found
1. **Windows `root` comment was wrong.** In "Path Components", the code commented `print(f"Root: {win_path.root}")    # /`. On Windows, `PureWindowsPath("C:/Users/Alice/Documents").root` is `'\\'` (a single backslash when printed), not `'/'`. Fixed the inline comment to `# \`.
2. **File descriptor leak in `safe_write`.** `tempfile.mkstemp(...)` returns `(fd, path)` where `fd` is an OPEN file descriptor that the caller must close. The original example never closed `temp_fd` and instead opened the file again via `Path.write_text`, leaking the descriptor. Added `os.close(temp_fd)` immediately after the `mkstemp` call and added `import os` (removed the unused `import shutil` for that example). Behavior of the function is otherwise unchanged.

## Review Notes
- Version-specific APIs used in the post and their minimum Python versions are correctly noted or otherwise safely available:
  - `pathlib` itself — Python 3.4+
  - `Path.home()` — Python 3.5+
  - `mkdir(parents=..., exist_ok=...)` — Python 3.5+
  - `unlink(missing_ok=True)` — Python 3.8+ (the post already calls this out)
  - `Path.with_stem()` — Python 3.9+ (not noted in the post; readers on 3.8 will hit `AttributeError`). Not a correctness defect, but worth flagging on a future revision.
- The `# On Windows` snippet uses `Path(...)` rather than `PureWindowsPath(...)`. On a non-Windows interpreter `Path("C:/Users/Alice/Documents")` creates a `PosixPath` and the `.drive`/`.root` output would differ. The comment makes the platform assumption explicit, so this is acceptable but could be tightened to `PureWindowsPath` for portability of the demo.
- `path.match("data/*.csv")` returning `True` for `Path("data/report.csv")` was verified empirically and matches the documented right-to-left, component-wise glob semantics.
- All other path-property outputs (`name`, `stem`, `suffix`, `suffixes`, `parent`, `parents`, `parts`, `anchor`) were verified empirically against the example path `/home/user/project/data/report.csv.gz` and match what the post states.

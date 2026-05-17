# Validation Summary: How to Use Emacs on Ubuntu for Text Editing

## Status
validated

## Post Type
Tutorial / Reference guide — a beginner-to-intermediate tutorial on installing and using Emacs on Ubuntu, with reference tables of keybindings and a sample init.el configuration.

## Technologies Covered
- GNU Emacs (with reference to emacs29 via the kelleyk PPA)
- Ubuntu (apt, add-apt-repository, PPA)
- Emacs Lisp (init.el configuration)
- Built-in Emacs subsystems: isearch, dired, ibuffer, query-replace, kill ring, buffers/windows

## Sources Consulted
- GNU Emacs Manual — https://www.gnu.org/software/emacs/manual/
- GNU Emacs Lisp Reference Manual, Batch Mode — https://www.gnu.org/software/emacs/manual/html_node/elisp/Batch-Mode.html
- GNU Emacs Manual, Setting Mark — https://www.gnu.org/software/emacs/manual/html_node/emacs/Setting-Mark.html
- Kevin Kelley's Emacs PPA — https://launchpad.net/~kelleyk/+archive/ubuntu/emacs
- GNU Emacs source — etc/themes/wombat-theme.el (built-in theme distribution)
- Mastering Emacs — article on mark/transient-mark-mode behavior

## Issues Found
- **`--eval` with multiple s-expressions (incorrect).** The original example was:
  ```
  emacs --batch --eval '(find-file "file.txt") (goto-line 5) (save-buffer) (kill-emacs)'
  ```
  Emacs's `--eval` flag reads exactly one s-expression per argument via `read-from-string`, so only `(find-file "file.txt")` would have been evaluated and the remaining forms silently discarded — the file would never have been saved. Fixed by wrapping the forms in `(progn ...)`:
  ```
  emacs --batch --eval '(progn (find-file "file.txt") (goto-line 5) (save-buffer) (kill-emacs))'
  ```

## Review Notes
- All keybindings were verified against the standard `global-map` in modern GNU Emacs (C-x C-f, C-x C-s, C-x C-w, C-x C-c, navigation keys, kill-ring keys, M-%, C-M-%, dired keys, C-h help prefix, etc.). All are correct.
- `C-SPC C-SPC` is the documented way to push the mark onto the mark ring without activating the region — confirmed in the GNU Emacs manual.
- The `+LINE FILE` command-line argument is officially supported for opening a file at a specific line.
- `wombat` is a built-in theme shipped with Emacs.
- The `ppa:kelleyk/emacs` PPA is maintained and provides `emacs29` for Ubuntu.
- Style/pedantic note (not changed): `goto-line` is interactive and the elisp manual recommends `(goto-char (point-min))` then `(forward-line (1- N))` from Lisp code. It still works in the batch example and keeps the snippet readable, so left as-is.
- Style/pedantic note (not changed): The `auto-save-file-name-transforms` setting in the sample init.el expects `~/.emacs.d/autosave/` to exist (or for Emacs to create it on first write); this is fine for a tutorial-level config and is not technically wrong.

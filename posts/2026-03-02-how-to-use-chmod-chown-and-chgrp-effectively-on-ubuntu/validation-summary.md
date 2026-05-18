# Validation Summary: How to Use chmod, chown, and chgrp Effectively on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- chmod (GNU coreutils)
- chown (GNU coreutils)
- chgrp (GNU coreutils)
- find (GNU findutils) - used in -exec patterns
- ls (GNU coreutils) - used in audit example
- Linux file permission model (octal/symbolic modes, setgid bit, ownership semantics)
- Ubuntu system administration

## Sources Consulted
- GNU coreutils chmod(1) man page (verified syntax, -R, --reference, X behavior, setuid/setgid handling)
- GNU coreutils chown(1) man page (verified [OWNER][:[GROUP]] syntax, --reference, --no-dereference / -h, -R behavior with -H/-L/-P)
- GNU coreutils chgrp(1) man page (verified --reference and -R support)
- GNU coreutils manual: https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html
- GNU coreutils manual: https://www.gnu.org/software/coreutils/manual/html_node/chown-invocation.html
- find(1) man page (verified -type d/-type f and -exec ... {} \; syntax)
- POSIX / GNU file mode bits documentation (verified octal mappings 644/755/600/700/750/640/2775)

## Issues Found
No technical issues found.

All claims and examples were verified against the GNU coreutils documentation:

- Octal notation mappings (644→rw-r--r--, 755→rwxr-xr-x, 600→rw-------, 700→rwx------, 750→rwxr-x---, 640→rw-r-----, 2775→setgid+rwxrwxr-x) are all correct.
- Symbolic notation syntax (u+x, go-w, u=rw,g=r,o=, o-rwx, +x) is valid per the `[ugoa...][[-+=][perms...]...]` grammar.
- The capital `X` semantics ("execute/search only if the file is a directory or already has execute permission for some user") match the chmod man page verbatim.
- `chmod --reference=RFILE` is a valid documented form.
- `chown [OWNER][:[GROUP]]` forms — including `alice`, `alice:developers`, and `:developers` (group-only) — match the documented syntax.
- "Only root can change a file's owner" and "users can change the group only to a group they belong to" reflect the standard Linux/POSIX behavior.
- `chown --reference=` and `chown --no-dereference` (-h) are both documented options.
- `chgrp --reference=` and `chgrp -R` are both documented options.
- The setgid (2xxx) directory inheritance behavior is correctly described.
- The `find ... -type d/-type f -exec chmod ... {} \;` patterns are syntactically correct and produce the described results.
- `ls -lan` correctly produces a long listing with numeric UIDs/GIDs (the -n flag implies -l, but the combination is harmless).

## Review Notes
- Minor pedantic point (not corrected): The comment `chmod +x script.sh   # equivalent to a+x (all)` is the common shorthand, but per the chmod man page, when the `who` letters are omitted "the effect is as if (a) were given, but bits that are set in the umask are not affected." For typical interactive use with a standard umask of 022, the two are functionally identical, so the post's framing is acceptable shorthand and not corrected.
- The warning about `chown -R` following symlinks reflects defensive best practice. Modern GNU chown defaults to `-P` (do not traverse symbolic links to directories) under `-R`, but for non-directory symlinks the default `--dereference` behavior still applies, so the warning and the recommendation to use `--no-dereference` are appropriate.
- The first code comment under "Recursive changes with -R" reads "Set all files and directories under /var/www to owned by www-data" while the actual command is `chmod -R 755 /var/www/html` (a permission change, not an ownership change). The text immediately after the block correctly discusses the permissions issue, so the inline comment is a minor stylistic mismatch rather than a technical error; left as-is per the instruction to only fix technical errors.
- All real-world scenarios (web app directory with deploy:www-data and 750/640, shared team directory with 2775 setgid, locked-down config files with 640 for secrets, deploy scripts with 700/750) reflect sound, current Ubuntu sysadmin practice.

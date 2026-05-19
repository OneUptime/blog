# Validation Summary: How to Create a .deb Package from Source on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Debian packaging
- debhelper
- dh_make
- dpkg-buildpackage
- Lintian
- devscripts/dch
- GNU Make
- C
- Python script packaging

## Sources Consulted
- Debian debhelper(7) manpage: https://manpages.debian.org/bookworm/debhelper/debhelper.7.en.html
- Debian dh_make(1) manpage: https://manpages.debian.org/bookworm/dh-make/dh_make.1.en.html
- Debian dpkg-buildpackage(1) manpage: https://manpages.debian.org/bookworm/dpkg-dev/dpkg-buildpackage.1.en.html
- Debian lintian(1) manpage: https://manpages.debian.org/testing/lintian/lintian.1.en.html
- Debian Policy Manual, Source packages: https://www.debian.org/doc/debian-policy/ch-source.html
- Guide for Debian Maintainers, Basics for packaging: https://www.debian.org/doc/manuals/debmake-doc/ch06.en.html
- GNU coreutils install(1) manpage: https://man7.org/linux/man-pages/man1/install.1.html

## Issues Found
- The package layout and compat section used a separate `debian/compat` file while the control example also used `Build-Depends: debhelper-compat (= 13)`. Current debhelper documentation says to use either the `debhelper-compat` build dependency or `debian/compat`, and recommends the build dependency where possible. Removed `debian/compat` from the layout and changed the compat section to verify the `Build-Depends` entry instead of creating `debian/compat`.
- The Makefile install target used `install -m 0755 myhello $(DESTDIR)/usr/bin/myhello`, which can fail because the destination directory may not exist in the package staging tree. Changed it to `install -D -m 0755 ...` so leading destination directories are created.
- The expected original source tarball was listed as `myhello_1.0.orig.tar.xz`, but `dh_make --createorig` creates `../<packagename>_<version>.orig.tar.gz` according to the dh_make manpage. Updated the expected output to `myhello_1.0.orig.tar.gz`.
- The Lintian example used `lintian -v --explain-tags`, but the current lintian manpage documents `-i`/`--info` for explanatory information and references `lintian-explain-tags` for long tag descriptions. Replaced the command with `lintian -i`.

## Review Notes
The tutorial is technically relevant and the corrected examples align with current Debian/Ubuntu packaging tooling. I verified command and file-format claims against official Debian manpages and Debian Policy. I could not run the complete example locally because `dh_make` and `lintian` are not installed in this review environment, but the relevant command syntax and behavior were checked against official documentation.

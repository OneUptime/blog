# Validation Summary: How to Use debhelper for Package Building on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- debhelper (dh sequencer, dh_* helpers)
- Debian packaging (debian/control, debian/rules, debian/compat)
- dpkg-buildpackage, fakeroot
- lintian
- Build systems: autoconf, cmake, pybuild (dh-python), cargo (dh-cargo), maven
- Debug symbol packages (dbgsym)
- Systemd integration (dh_installsystemd)
- Multi-binary source packages

## Sources Consulted
- debhelper(7) and debhelper-compat-upgrade-checklist(7) — https://manpages.debian.org/testing/debhelper/debhelper.7.en.html
- dh(1) — https://manpages.debian.org/testing/debhelper/dh.1.en.html
- dh_strip(1) — https://manpages.debian.org/testing/debhelper/dh_strip.1.en.html
- dh_auto_configure(1) — https://manpages.debian.org/testing/debhelper/dh_auto_configure.1.en.html
- dh_installsystemd(1) — https://manpages.debian.org/testing/debhelper/dh_installsystemd.1.en.html
- Debian Wiki: AutomaticDebugPackages — https://wiki.debian.org/AutomaticDebugPackages
- Debian Rust Team Book — https://rust-team.pages.debian.net/book/packaging-tools.html
- Debian Perl Team — debhelper notes — https://perl-team.pages.debian.net/debhelper.html
- Lintian User's Manual — https://lintian.debian.org/manual/index.html
- Debian package archive (dh-make-perl, dh-cargo, dh-python)

## Issues Found

1. **Invalid heredoc redirection in "Minimal debian/rules" example.** The original used `cat debian/rules << 'EOF' ... EOF`, which does not redirect output to the file. Changed to `cat > debian/rules << 'EOF' ...` so the snippet actually writes the file as the surrounding text claims.

2. **Non-existent `dh-perl` package.** The original suggested `sudo apt install dh-perl -y`. There is no `dh-perl` package in Debian/Ubuntu. The Perl build systems (`perl_makemaker`, `perl_build`) are bundled with `debhelper` itself; the user-facing scaffolding tool is `dh-make-perl`. Replaced the line with `sudo apt install dh-make-perl -y` and added a one-line clarification that the buildsystems ship with debhelper.

3. **Stale `dh-systemd` recommendation.** The original suggested `sudo apt install dh-systemd -y`. The functionality was merged into debhelper in 2016, the helpers were superseded by `dh_installsystemd` in compat 11, and the transitional `dh-systemd` package was removed in Debian Bullseye (so it is gone in Ubuntu 22.04+). Removed the install command and rewrote the surrounding comment to say no extra package is required.

4. **Incorrect manual dbgsym package declaration.** The original showed appending a `mypackage-dbgsym` stanza to `debian/control`, then noted (correctly) that `dh_strip` generates dbgsym packages automatically in compat 10+. These contradict each other — manual stanzas are wrong and will produce lintian errors / build conflicts. Replaced the bogus stanza with the correct opt-out (`DEB_BUILD_OPTIONS=noautodbgsym`) and the standard `--dbgsym-migration` example for switching from a legacy `-dbg` package.

5. **Misleading build-system auto-detection list.** The original listed Python (setup.py / pyproject.toml), Rust (Cargo.toml), and Maven (pom.xml) as auto-detected by `dh_auto_configure`. In current debhelper only `autoconf`, `cmake`, and the Perl build systems are reliably auto-detected from the core; Python (`pybuild`), Rust (`cargo`), and Maven (`maven`) require an add-on package and usually an explicit `--buildsystem=` selection. Split the list into "auto-detected" and "selected explicitly via add-ons" to match reality.

## Review Notes

- Compat level 13 is still the recommended level per `debhelper-compat-upgrade-checklist(7)` (compat 14 exists but is explicitly marked open for development and not recommended for production packages). The post's recommendation is correct as of 2026-05.
- `lintian -iIE --pedantic` is the standard "show me everything" invocation and is correct (`-i` info text, `-I` info tags, `-E` experimental tags, `--pedantic` pedantic tags).
- The `override_dh_auto_test:` rule with only a tab-indented `#` comment is a valid no-op recipe in make; tests will be skipped as intended.
- Standards-Version `4.6.0` in the multi-binary example is somewhat old (current is 4.7.x) but not incorrect — the build will still succeed and lintian will only emit an informational/pedantic tag. Left as-is since it is not technically wrong.

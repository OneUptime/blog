# Validation Summary: How to Build and Package Go Applications as RPMs on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RPM packaging and spec files
- rpmbuild and rpmdevtools
- Go
- systemd services
- dnf/yum package installation

## Sources Consulted
- Red Hat Enterprise Linux RPM Packaging Guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/rpm_packaging_guide/index
- RPM spec file reference: https://rpm-software-management.github.io/rpm/manual/spec.html
- Fedora systemd packaging guidelines: https://fedoraproject.org/wiki/Packaging:Systemd
- Go command documentation: https://pkg.go.dev/cmd/go
- Go linker documentation: https://pkg.go.dev/cmd/link
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The source tarball commands escaped `${VERSION}` as `\${VERSION}`. In a shell, that would create literal `myservice-${VERSION}` paths and a tarball name that does not match `Source0: %{name}-%{version}.tar.gz`. I removed the backslashes so the variable expands to `1.0.0`.
- The systemd unit file was created in `~/rpmbuild/SOURCES`, but the spec did not declare it as a source, install it into `%{_unitdir}`, or include it in `%files`. I added `Source1`, installed it to `%{buildroot}%{_unitdir}/%{name}.service`, and included it in the package file list.
- The spec used `%systemd_post` and `%systemd_preun` but did not include the corresponding `%postun` daemon-reload/restart handling. I added `%systemd_postun_with_restart %{name}.service`, matching the documented systemd scriptlet macro pattern.
- The post installed `rpm-build`, `rpmdevtools`, and `golang`, but the spec requires systemd RPM macros at build time. I added `systemd-rpm-macros` to the install command and `BuildRequires`.

## Review Notes
The Go example uses current standard-library APIs and the `go build -ldflags="-X main.version=..."` pattern matches Go linker documentation for setting package-level string variables. The local environment did not include the RHEL RPM toolchain, so the RPM build itself was validated by static review against official documentation rather than by running `rpmbuild`.

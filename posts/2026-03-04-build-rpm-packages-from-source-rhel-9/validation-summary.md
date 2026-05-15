# Validation Summary: How to Build RPM Packages from Source on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RPM and rpmbuild
- RPM spec files
- Source RPMs
- DNF and dnf-plugins-core
- Mock
- rpmlint

## Sources Consulted
- Red Hat Enterprise Linux 9 Packaging and distributing software: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/packaging_and_distributing_software/
- Red Hat RHEL 9 RPM packaging workspace documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/packaging_and_distributing_software/setting-up-rpm-packaging-workspace_packaging-and-distributing-software
- rpm.org rpmbuild(8) manual: https://rpm.org/docs/4.19.x/man/rpmbuild.8.html
- rpm.org spec file format manual: https://rpm.org/docs/4.19.x/manual/spec.html
- dnf-plugins-core download plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/download.html
- Mock project documentation: https://rpm-software-management.github.io/mock/
- Mock RHEL chroots documentation: https://rpm-software-management.github.io/mock/Feature-rhelchroots.html

## Issues Found
- The example `%changelog` entry used `Tue Mar 04 2026`, but March 4, 2026 is a Wednesday. Changed it to `Wed Mar 04 2026`.
- The `%setup -q` example assumes the source archive unpacks into a directory named `%{name}-%{version}`. Added a sentence clarifying that `hello-1.0.0.tar.gz` should unpack into a top-level `hello-1.0.0` directory.
- The `dnf download --source` command depends on the DNF download plugin from `dnf-plugins-core`. Added an installation command before the example.
- The runtime dependency section attributed automatic dependency detection to DNF. Changed it to RPM, which is the component that generates automatic package dependencies during RPM builds.
- The changelog tip said `%changelog` is required by RPM. Changed it to say changelogs are useful and expected by many packaging guidelines, which is more accurate for modern RPM.

## Review Notes
The local review environment did not have `rpm`, `rpmbuild`, or `mock` installed, so command behavior was verified against official documentation rather than local execution. The post is technically relevant and the remaining examples are consistent with RHEL 9 RPM packaging guidance.

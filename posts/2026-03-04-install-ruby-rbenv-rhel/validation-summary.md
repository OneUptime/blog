# Validation Summary: How to Install Ruby with rbenv on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Ruby
- rbenv
- ruby-build
- Bundler
- dnf

## Sources Consulted
- rbenv README and command reference: https://github.com/rbenv/rbenv
- ruby-build README: https://github.com/rbenv/ruby-build
- ruby-build suggested build environment for RHEL/CentOS: https://github.com/rbenv/ruby-build/wiki

## Issues Found
- The introduction said rbenv compiles Ruby from source and provides access to any version. Updated it to clarify that rbenv with ruby-build compiles Ruby from source and provides access to Ruby versions supported by ruby-build.
- The dependency installation command omitted several packages from ruby-build's documented RHEL build environment, including autoconf, patch, tar, and perl-FindBin. Added those packages to reduce build failures on RHEL.
- The post used `rbenv install -l` to list available Ruby versions before installing older patch releases. Current rbenv documentation says `-l` lists latest stable versions, while `-L` lists all definitions. Changed the command to `rbenv install -L`.

## Review Notes
- `rbenv rehash` is technically valid, but current rbenv documentation notes it is typically run automatically after installing gems.
- On some RHEL installations, `libyaml-devel` may require enabling an additional repository if Ruby's psych extension fails to build.

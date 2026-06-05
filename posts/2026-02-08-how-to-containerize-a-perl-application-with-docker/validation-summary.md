# Validation Summary: How to Containerize a Perl Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Perl
- Docker
- Docker Compose
- Mojolicious and Morbo
- CPAN, cpanfile, cpanminus, and Carton
- Apache CGI / mod_perl
- MariaDB runtime libraries

## Sources Consulted
- Mojolicious::Lite documentation: https://docs.mojolicious.org/Mojolicious/Lite
- Mojolicious daemon command documentation: https://docs.mojolicious.org/Mojolicious/Command/daemon
- Mojolicious prefork command documentation: https://docs.mojolicious.org/Mojolicious/Command/prefork
- Morbo documentation: https://docs.mojolicious.org/morbo
- cpanfile documentation on MetaCPAN: https://metacpan.org/pod/cpanfile
- cpanminus documentation on MetaCPAN: https://metacpan.org/dist/App-cpanminus/view/lib/App/cpanminus/fatscript.pm
- Carton documentation on MetaCPAN: https://metacpan.org/pod/Carton
- Carton install documentation: https://metacpan.org/dist/Carton/view/lib/Carton/Doc/Install.pod
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Perl HTTP::Tiny documentation: https://perldoc.perl.org/HTTP::Tiny
- Docker Official Perl image documentation: https://hub.docker.com/_/perl

## Issues Found
- The Dockerfile examples described the Mojolicious daemon command as production mode, but the command did not set `-m production`; Mojolicious defaults to development unless `MOJO_MODE`/`PLACK_ENV` or `-m` is set. Updated the production `daemon` and `prefork` commands to pass `-m production`.
- The multi-stage Dockerfile installed modules into `/app/local` in the builder stage, but the Compose example targeted that builder stage without `PERL5LIB` or `PATH` configured. Added the local-lib environment variables to the builder stage so the development target can load installed modules and find local binaries.
- The Docker Compose example used the obsolete top-level `version: "3.8"` key. Removed it to match the current Compose Specification.
- The live-reload example started a daemon in the service and then instructed users to run `morbo` inside the same container on the same port, which would conflict. Updated the Compose service command to run `morbo` directly and changed the command example to `docker compose up app`.
- The Carton runtime stage set `PERL5LIB` but not `PATH`, even though Carton installs executable scripts into `local/bin`. Added `PATH=/app/local/bin:$PATH`.
- The custom CPAN mirror example used `--mirror ... --mirror-only`; updated it to `--from` so cpanminus uses the HTTPS mirror as the only source rather than appending it to configured mirrors.

## Review Notes
The use of `perl:5.38` remains technically valid, but future revisions should consider a currently maintained Perl image tag for security updates. The sample `.dockerignore` excludes `README.md`; that is fine for this sample app, but projects that need README metadata during builds should remove that entry.

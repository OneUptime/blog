# Validation Summary: How to Containerize a Haskell Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Haskell
- GHC and GHC RTS options
- Scotty
- Stack
- Cabal
- Hpack package.yaml
- Docker and Dockerfile multi-stage builds
- Docker BuildKit cache mounts
- Docker Compose
- Debian and scratch container images

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/builder
- Docker Build checks for JSON-form ENTRYPOINT/CMD: https://docs.docker.com/reference/build-checks/json-args-recommended/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Stack build command documentation: https://docs.haskellstack.org/en/latest/commands/build_command/
- Stack package description documentation: https://docs.haskellstack.org/en/v3.3.1/tutorial/package_description/
- Cabal commands documentation: https://cabal.readthedocs.io/en/stable/cabal-commands.html
- Cabal getting started and package format documentation: https://cabal.readthedocs.io/en/stable/getting-started.html
- GHC RTS options user guide: https://ghc.gitlab.haskell.org/ghc/doc/users_guide/runtime_control.html
- GHC.Stats API documentation: https://downloads.haskell.org/ghc/9.10.1/docs/libraries/base-4.20.0.0-1f57/GHC-Stats.html
- Scotty API documentation: https://hackage.haskell.org/package/scotty/docs/Web-Scotty.html
- Hpack package format reference: https://hackage.haskell.org/package/hpack

## Issues Found
- The package definition comment implied that the shown `package.yaml` was also a Cabal file. Updated it to clarify that this is Hpack format and Cabal users need an equivalent `.cabal` file.
- The Stack section called Stack the "most popular" Haskell build tool and described the build image as official. Changed those claims to more precise wording.
- The Cabal section described Cabal as "built-in" and copied `cabal.project.freeze` unconditionally. Updated the wording and removed the unconditional freeze-file `COPY`, because Docker builds fail if that optional file is absent.
- The Cabal dependency and binary-copy commands were too broad. Updated them to target `exe:my-haskell-app`, matching Cabal's target-oriented command behavior and avoiding ambiguity.
- The static linking section overstated how easy static linking is for Haskell applications. Added the caveat that all native dependencies must be available as static libraries, added `libffi-dev`, removed the unnecessary `-fPIC`, and changed the `ldd` verification to fail the build if the binary is still dynamic.
- The RTS `ENTRYPOINT` example used inline comments inside Docker's JSON exec form, which is invalid Dockerfile syntax. Moved the explanations into Dockerfile comments and kept the `ENTRYPOINT` as a valid JSON array.
- The monitoring snippet used `liftIO` without importing it. Added `Control.Monad.IO.Class (liftIO)`.
- Updated the description of `-N` from "CPU cores" to GHC's more precise "capabilities" terminology.

## Review Notes
- The Compose snippets still include `version: "3.9"`. Docker Compose treats this top-level field as obsolete but backward compatible, so it is not a functional error. A future cleanup could remove it.
- The static linking Dockerfile is intentionally conservative after the edits, but real projects may still need additional static development libraries depending on their Haskell and C dependencies.

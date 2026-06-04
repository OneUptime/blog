# Validation Summary: How to Use the ONBUILD Instruction for Template Dockerfiles

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Docker
- Dockerfile ONBUILD instruction
- Docker CLI
- Node.js and npm
- Python and pip
- Java and Apache Maven
- Multi-stage Docker builds

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker CLI build help output from the local Docker installation
- npm CLI `npm ci` documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- Local npm 10.9.4 `npm help ci` output
- Apache Maven Dependency Plugin `dependency:go-offline` documentation: https://maven.apache.org/plugins/maven-dependency-plugin/go-offline-mojo.html

## Issues Found
- The Node.js examples used `npm ci --only=production`. npm's current documented way to omit development dependencies is `npm ci --omit=dev`, so the Dockerfile snippets and trigger inspection examples were updated.
- The Java/Maven base image example placed ONBUILD triggers in the first stage of a multi-stage Dockerfile, then tagged the final runtime stage. The final tagged image would not contain the ONBUILD triggers, so child images would not execute them. The example was changed to a single-stage Maven template image and the limitation note was clarified.
- The Java/Maven example's `CMD` referenced `app.jar` without creating it. The build trigger now copies the Maven-built JAR to `/app/app.jar`, and the `CMD` points to that path.

## Review Notes
The ONBUILD behavior, ordering, restrictions on `ONBUILD ONBUILD`, `ONBUILD FROM`, and `ONBUILD MAINTAINER`, trigger inspection through `.Config.OnBuild`, and build-context dependency of ONBUILD `COPY`/`ADD` were consistent with Docker's official Dockerfile reference. The Docker build commands and `docker inspect --format` usage are valid.

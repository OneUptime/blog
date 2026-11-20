# Validation summary

Reviewed the article against official TeamCity Java configuration and custom image guidance, Dockerfile documentation, and vendor release/download instructions. The example keeps application JDK selection separate from agent startup and records deployment-specific inputs explicitly.

## Checks performed

- Three shell blocks and Dockerfile RUN command passed sh -n
- Dockerfile parsed with dockerfile-parse 2.0.1; ARG/FROM relationship, user restoration and inherited entrypoint checked
- Build-JDK selection shell executed against a stub compiler in a path containing spaces; missing and empty variable failures verified
- Mermaid structurally checked: seven nodes and seven edges
- Generated social image visually reviewed

## Limitations

- No Docker image built or TeamCity agent started
- Stub compiler test validates shell selection only, not a real Java toolchain
- Historical tool release examples are illustrative, not current patch recommendations; base digest is a placeholder
- No binary ABI compatibility, architecture, permissions in image, plugin availability, registry or cluster access tested
- Dockerfile parser is not BuildKit; Mermaid was not rendered

## Sources reviewed

- https://www.jetbrains.com/help/teamcity/configure-java-for-agent.html
- https://docs.docker.com/build/building/best-practices/
- https://github.com/adoptium/temurin21-binaries/releases/tag/jdk-21.0.9%2B10
- https://nodejs.org/en/blog/release/v24.11.0
- https://docs.docker.com/engine/release-notes/28/
- https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- https://adoptium.net/installation/archives/
- https://nodejs.org/en/download/archive/v22.14.0
- https://docs.docker.com/engine/install/binaries/
- https://docs.docker.com/reference/dockerfile/
- https://github.com/JetBrains/teamcity-docker-images/blob/2ff7c4a1cc8c5bc10f7b52ded42f85d5bf1615ff/custom/README.md
- https://www.jetbrains.com/help/teamcity/predefined-build-parameters.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

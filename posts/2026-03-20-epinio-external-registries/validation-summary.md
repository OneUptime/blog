# Validation Summary: How to Configure Epinio with External Container Registries

## Status
not-technically-relevant

## Post Type
Tutorial / Guide (template-style, off-topic)

## Technologies Covered
- Epinio
- Epinio CLI
- Helm
- Kubernetes
- Container registries
- Node.js
- Paketo Buildpacks
- Shell scripting
- HTTP / curl

## Sources Consulted
- Epinio Introduction — https://docs.epinio.io/
- Epinio installation guide, container registry section — https://docs.epinio.io/installation/install_epinio
- Epinio how-to, external container registry setup — https://docs.epinio.io/howtos/customization/setup_external_registry
- Epinio namespaces tutorial — https://docs.epinio.io/1.8.0/tutorials/namespace-tutorial
- Epinio `epinio push` command reference — https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio supported applications — https://docs.epinio.io/references/supported_applications
- Paketo Buildpacks, Node.js reference — https://paketo.io/docs/reference/nodejs-reference/

## Issues Found
- The post is not actually about configuring Epinio with external container registries. Official Epinio documentation configures an external registry during Helm installation by disabling the in-cluster registry and setting values such as `containerregistry.enabled=false`, `global.registryURL`, `global.registryNamespace`, `global.registryUsername`, and `global.registryPassword`. The draft never shows that configuration path.
- The body is instead a generic Epinio application deployment walkthrough (`epinio target`, `epinio push`, `epinio app show`, logs, env vars, scaling, delete). Those commands are related to using Epinio after installation, not to connecting Epinio to Docker Hub, GCR, Harbor, or another external registry for image storage.
- The title and description explicitly promise external registry coverage ("Connect Epinio to external container registries like Docker Hub, GCR, or Harbor for image storage"), but no step configures registry credentials, registry namespace, registry TLS trust, or Helm values. This is a topic-level mismatch, not a minor inaccuracy.
- The `app.sh` example is not a documented Epinio-supported application layout. Epinio stages source code with Paketo buildpacks or accepts pre-built images, and its supported-applications documentation notes that custom start commands generally require a `Procfile`. A bare shell script with `nc -l -p` is not a reliable example for this post.
- The article contains template artifacts, including repeated title text in the introduction and the malformed conclusion sentence "How to Configure Epinio with External Container Registries with Epinio demonstrates...". That reinforces that this is a generic template draft rather than a real external-registry guide.
- Because the problems are structural and the article does not match its stated subject, I did not patch `README.md`. A technically correct version would need a full rewrite around the real Helm-based external-registry setup flow, so the post is marked `not-technically-relevant` for removal instead.

## Review Notes
- I did not run a live Epinio cluster during this review. The classification is based on official Epinio and Paketo documentation.
- Some CLI commands in the draft are real Epinio commands, but validating them would not salvage the article because they do not address external registry configuration.
- Current official docs still describe external registries as an installation-time concern and document optional TLS certificate handling via `containerregistry.certificateSecret` for secured registries.

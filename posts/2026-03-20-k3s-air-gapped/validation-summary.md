# Validation Summary: How to Install K3s in an Air-Gapped Environment

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- K3s
- Kubernetes
- containerd
- Private container registries
- Docker / Distribution registry
- Air-gapped Linux deployment

## Sources Consulted
- K3s Air-Gap Install: https://docs.k3s.io/installation/airgap
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s Environment Variables: https://docs.k3s.io/reference/env-variables
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- Docker `docker image tag` reference: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker `docker image save` reference: https://docs.docker.com/reference/cli/docker/image/save/
- CNCF Distribution deployment guide: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution insecure registry guide: https://distribution.github.io/distribution/about/insecure/
- K3s releases: https://github.com/k3s-io/k3s/releases

## Issues Found
- The post used older `rancher/k3s` release URLs and pinned older example versions. I updated the examples to the current official `k3s-io/k3s` release URLs and refreshed the version pins to recent releases.
- The private registry example tagged `nginx:alpine` as `registry.internal:5000/nginx:alpine`, which does not match Docker Hub's implicit `library` namespace for `nginx:alpine`. I corrected it to `registry.internal:5000/library/nginx:alpine` so the `docker.io` mirror example resolves correctly.
- The `registries.yaml` sample mixed an HTTP mirror endpoint with TLS and authentication settings, and it configured mirrors for registries that were not actually populated in the example. I simplified it to a correct `docker.io` mirror that matches the sample registry deployment and push flow.
- The registry setup used a plain HTTP registry but did not mention that Docker must treat it as an insecure registry before `docker push` will work. I added an explicit note and example `daemon.json` setting so the push step is not misleading.
- The verification step described `nginx:alpine` as a pre-loaded image even though the guide supplies it through the private registry mirror. I corrected the wording.
- The update section was labeled as automated upgrades even though the script only prepares a transfer bundle for a manual air-gapped update workflow. I renamed the section to match what the script actually does.
- The `docker save` example used a non-canonical argument order. I rewrote it to the standard `docker save -o ... IMAGE` form from the Docker CLI docs.

## Review Notes
- K3s air-gap installs on SELinux-enabled nodes require the `k3s-selinux` RPM and any OS policy dependencies to be made available offline; the official air-gap guide calls this out as an additional prerequisite.
- For environments that must never fall back to upstream registries, K3s supports `--disable-default-registry-endpoint` in addition to the `registries.yaml` mirror configuration.

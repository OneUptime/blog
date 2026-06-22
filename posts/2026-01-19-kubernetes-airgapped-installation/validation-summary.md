# Validation Summary: How to Install Kubernetes in Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Kubernetes
- kubeadm
- containerd
- Docker Engine and Docker Registry
- Harbor
- Calico / Tigera operator
- kubectl
- Debian/Ubuntu and RHEL/CentOS package tooling
- etcd backup with etcdctl
- Helm chart image configuration

## Sources Consulted
- Kubernetes kubeadm init documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubeadm v1beta3 configuration API: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- containerd registry configuration documentation: https://containerd.io/docs/2.3/cri/registry/
- Docker certificate configuration documentation: https://docs.docker.com/engine/security/certificates/
- Kubernetes kubectl docker-registry secret reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Calico alternate registry documentation: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico v3.26.1 Tigera operator manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/tigera-operator.yaml
- Harbor installer documentation and installer behavior: https://goharbor.io/docs/2.14.0/install-config/download-installer/ and https://github.com/goharbor/harbor/blob/main/make/install.sh
- ingress-nginx release image references: https://github.com/kubernetes/ingress-nginx/releases
- Flannel upstream manifest reference: https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml

## Issues Found
- Replaced obsolete `k8s.gcr.io` image references with `registry.k8s.io` references used by current Kubernetes-hosted component images.
- Added the missing `quay.io/tigera/operator:v1.30.4` image because the Calico operator manifest for Calico v3.26.1 uses that operator image.
- Updated Debian package version suffixes from the legacy `-00` form to the `-1.1` suffix used by packages from `pkgs.k8s.io`.
- Updated the Harbor offline installer example from v2.9.0 to v2.14.0 and removed `--with-notary`, because Notary support has been removed from current Harbor installer behavior.
- Added a Subject Alternative Name to the self-signed registry certificate command, because modern TLS verification does not rely on the common name alone.
- Fixed the image retagging script so it preserves repository paths instead of collapsing every image to its final path segment. This avoids broken image names and collisions for images such as Calico, metrics-server, and ingress-nginx.
- Added the missing copy of the registry CA into containerd's certificate directory and made the trust update command work on both Debian-style and Red Hat-style systems.
- Replaced deprecated containerd `registry.mirrors` / `registry.configs` configuration with `config_path` plus a `hosts.toml` registry host configuration.
- Replaced offline package installation commands that used `rpm --nodeps`, `dpkg -i`, and `apt-get install -f` with package-manager local install commands that handle dependencies from the downloaded package set.
- Added the required `kubectl apply -f tigera-operator-airgap.yaml` step before applying the Calico `Installation` resource.
- Added the required trailing slash to Calico `spec.registry`, as documented by the Calico Installation API.
- Updated Helm image replacement from `k8s.gcr.io` to `registry.k8s.io`.
- Changed the maintenance image list from non-official `postgresql:16` to the official `postgres:16` image name.
- Corrected the backup script wording and output to avoid claiming that `kubectl get all` backs up every Kubernetes resource type.

## Review Notes
- The Kubernetes and Calico versions remain pinned to v1.28.0 and v3.26.1 as in the original tutorial. They are version-specific examples and should be refreshed before using this as a production baseline.
- The Harbor credentials and self-signed certificates are tutorial placeholders and should be replaced with site-specific secrets and certificate authority practices in a real air-gapped deployment.

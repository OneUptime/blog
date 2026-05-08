# Validation Summary: Troubleshooting Errors in calicoctl node run

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- calico/node
- Docker
- etcd
- Kubernetes
- Linux networking, BGP, iptables, and kernel modules

## Sources Consulted
- Calico documentation: calicoctl node run reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/run
- Calico documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: Configure IP autodetection, https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico documentation: calicoctl get reference, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node command overview, https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Docker documentation: docker system info, https://docs.docker.com/reference/cli/docker/system/info/
- Docker documentation: docker image pull, https://docs.docker.com/reference/cli/docker/image/pull/
- Docker documentation: docker inspect, https://docs.docker.com/reference/cli/docker/inspect/
- Docker documentation: docker container exec, https://docs.docker.com/engine/reference/commandline/exec

## Issues Found
- The prerequisites said Docker or containerd could be installed for `calicoctl node run`. The official `calicoctl node run` reference starts a Docker-based `calico/node` container, so the prerequisite was changed to Docker installed and running.
- The image pull failure example used `calico/node:v3.27.0` as a missing manifest, but that is a real Calico release tag. The failing example was changed to `calico/node:v3.27.99` while keeping `v3.27.0` as the valid image to pull.
- The certificate verification command used `openssl verify` against the client certificate while describing verification of the etcd server certificate. It was changed to `openssl s_client -connect ... -CAfile ... -verify_return_error`, and the expiration check was clarified as a client certificate check.
- The IP autodetection example set `--ip-autodetection-method` without explicitly forcing autodetection. The Calico reference documents `--ip=autodetect` when forcing autodetection with a selected method, so the command was updated.
- The Felix datastore diagnostic tried to run `calicoctl` inside the `calico-node` container. The post was changed to use the configured host `calicoctl` client instead.

## Review Notes
The remaining commands and flags are consistent with current Calico and Docker references. `calicoctl node run` remains most applicable to Docker-based/bare-metal workflows; Kubernetes DaemonSet deployments use similar diagnostics but usually configure Calico through manifests, environment variables, the operator, or Calico resources rather than this helper command directly.

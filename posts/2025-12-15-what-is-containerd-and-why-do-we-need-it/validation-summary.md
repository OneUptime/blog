# Validation Summary: What is containerd and Why Do We Need It?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- containerd
- Docker Engine and Docker Desktop
- Kubernetes Container Runtime Interface (CRI)
- dockershim
- runc and OCI runtimes
- CRI-O
- nerdctl
- ctr
- crictl
- CNI
- Prometheus metrics

## Sources Consulted
- containerd project overview: https://containerd.io/
- containerd getting started documentation: https://github.com/containerd/containerd/blob/main/docs/getting-started.md
- containerd CRI configuration guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd operations and metrics documentation: https://github.com/containerd/containerd/blob/main/docs/ops.md
- Kubernetes container runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes dockershim removal FAQ: https://kubernetes.io/blog/2022/02/17/dockershim-faq/
- Docker Engine install documentation for Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Engine install documentation for RHEL: https://docs.docker.com/engine/install/rhel/
- Docker Engine install documentation for Fedora: https://docs.docker.com/engine/install/fedora/
- nerdctl project documentation and releases: https://github.com/containerd/nerdctl
- CRI-O CNCF project page: https://www.cncf.io/projects/cri-o/
- CRI-O project README: https://github.com/cri-o/cri-o

## Issues Found
- The post described Kubernetes as adopting containerd as the default runtime. Kubernetes removed dockershim and requires CRI-compatible runtimes; it does not universally mandate containerd. Updated the description, introduction, and TL;DR to use CRI-compatible runtime language.
- The Docker feature list treated Docker Compose as part of Docker Engine. Updated it to say Docker Compose is a plugin included with Docker Desktop and commonly installed alongside Docker Engine.
- The containerd feature list said containerd has no CLI. Updated it to clarify that containerd has `ctr`, but not a Docker-like CLI.
- The Kubernetes benefits section claimed approximately 20% lower memory usage without a cited official source. Replaced it with the more defensible "lower runtime overhead."
- The RHEL/CentOS/Fedora installation command used the CentOS Docker repository for all Red Hat-based distributions and omitted `dnf-plugins-core`. Updated the commands with OS-specific Docker repository URLs and current Fedora syntax.
- The Kubernetes containerd configuration only showed the containerd 1.x CRI plugin path and used an older pause image. Added a containerd 2.x configuration example, updated the pause image, and clarified the cgroup driver default wording for kubeadm.
- The nerdctl install example used an old v1.7.0 release. Updated it to the current v2.3.3 release shown in GitHub releases.
- The CRI-O CNCF status was listed as Incubating. Updated it to Graduated.
- The troubleshooting section used `ctr tasks logs`, which is not a current `ctr` task subcommand. Replaced it with `crictl logs`.
- The best practices section said to set resource limits in containerd config. Updated it to set workload requests and limits in the orchestrator.
- The metrics section referred to `/metrics`. containerd exposes Prometheus metrics under `/v1/metrics`, so the text and Prometheus scrape config were updated.

## Review Notes
The post is technically relevant and contains runnable commands and configuration snippets. Some claims remain intentionally high-level, such as managed Kubernetes providers commonly using containerd, because the exact runtime can vary by provider, Kubernetes version, and node image.

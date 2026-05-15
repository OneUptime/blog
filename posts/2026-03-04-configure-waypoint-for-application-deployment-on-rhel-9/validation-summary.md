# Validation Summary: How to Configure Waypoint for Application Deployment on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- HashiCorp Waypoint Community Edition
- Docker
- Kubernetes
- Go
- HCL

## Sources Consulted
- HashiCorp Waypoint GitHub repository and release metadata: https://github.com/hashicorp/waypoint
- HashiCorp Waypoint Docker getting started tutorial: https://developer.hashicorp.com/waypoint/tutorials/get-started-docker/use-waypoint-with-docker
- HashiCorp Waypoint Kubernetes installation documentation: https://developer.hashicorp.com/waypoint/docs/platforms/kubernetes/install
- HashiCorp Waypoint input variables documentation: https://developer.hashicorp.com/waypoint/tutorials/fundamentals/configuration/input-variables
- HashiCorp Waypoint generated Docker plugin docs: https://github.com/hashicorp/waypoint/blob/main/docs/gen/platform-docker.json
- HashiCorp Waypoint generated Kubernetes plugin docs: https://github.com/hashicorp/waypoint/blob/main/docs/gen/platform-kubernetes.json
- HashiCorp Waypoint generated Docker registry plugin docs: https://github.com/hashicorp/waypoint/blob/main/docs/gen/registry-docker.json
- HashiCorp Waypoint generated Kubernetes release manager docs: https://github.com/hashicorp/waypoint/blob/main/docs/gen/releasemanager-kubernetes.json
- Red Hat RHEL 9 DNF repository management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- HashiCorp RPM repository metadata for RHEL 9: https://rpm.releases.hashicorp.com/RHEL/9/x86_64/stable/

## Issues Found
- The post presented Waypoint as current software without noting that HashiCorp Waypoint Community Edition is no longer actively maintained. Added a note that the tutorial uses the legacy Waypoint CLI and that the latest Community Edition release is 0.11.4.
- The prerequisites said Docker or Podman could be used for container builds. Waypoint's Docker platform and local server install expect Docker, and Podman is not a supported Waypoint install platform. Changed the prerequisite to Docker installed and running for the Docker examples.
- The RHEL 9 repository setup used `yum-config-manager` after installing `yum-utils`. Red Hat's RHEL 9 documentation uses `dnf config-manager`, supplied by DNF plugins. Updated the command to install `dnf-plugins-core` and use `dnf config-manager --add-repo`.
- The server install section said the install command outputs a token for authentication. HashiCorp's Docker tutorial shows that the install command configures a CLI context and recommends `waypoint ui -authenticate` for web UI authentication. Updated the wording accordingly.
- The UI section used `waypoint ui` as the command to get the UI URL. HashiCorp's docs consistently use `waypoint ui -authenticate` to open and authenticate to the web UI. Updated the command and comment.

## Review Notes
The remaining Waypoint HCL snippets use documented Docker and Kubernetes plugin fields such as `service_port`, `replicas`, `probe_path`, `static_environment`, Docker registry `image`, `tag`, and `local`. The Go example is syntactically valid and the simple `/` handler also responds to `/health`, so the Kubernetes probe path is acceptable for this example.

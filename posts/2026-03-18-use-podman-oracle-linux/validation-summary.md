# Validation Summary: How to Use Podman on Oracle Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Oracle Linux 8 and Oracle Linux 9
- Oracle Container Registry (OCR)
- Oracle Cloud Infrastructure Registry (OCIR)
- Buildah
- Skopeo
- Quadlet and systemd
- SELinux
- Oracle Instant Client
- Oracle Database Express Edition container images
- Oracle GraalVM container images

## Sources Consulted
- Oracle Linux Podman User's Guide: Install Podman and Related Utilities - https://docs.oracle.com/en/operating-systems/oracle-linux/podman/install.html
- Oracle Linux Podman User's Guide: Container Registries - https://docs.oracle.com/en/operating-systems/oracle-linux/podman/registries.html
- Oracle Linux learning lab: Get Started with Podman on Oracle Linux - https://docs.oracle.com/en/learn/run-containers-podman/index.html
- Oracle Linux learning lab: Use Compose Files with Podman on Oracle Linux - https://docs.oracle.com/en/learn/ol-podman-compose/
- Podman docs: `podman-systemd.unit(5)` - https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman docs: `podman-auto-update(1)` - https://docs.podman.io/en/latest/markdown/podman-auto-update.1.html
- Podman docs: `podman-run(1)` - https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman docs: `podman-healthcheck-run(1)` - https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman docs: `podman-compose(1)` - https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Oracle Cloud Infrastructure: Logging in to Oracle Cloud Infrastructure Registry - https://docs.oracle.com/en-us/iaas/Content/Functions/Tasks/functionslogintoocir.htm
- Oracle Cloud Infrastructure: Getting an Auth Token - https://docs.oracle.com/en-us/iaas/Content/Registry/Tasks/registrygettingauthtoken.htm
- Oracle Database Client Installation Guide: Installing Oracle Instant Client Using RPMs - https://docs.oracle.com/en/database/oracle/oracle-database/19/lacli/install-instant-client-using-rpm.html
- Oracle GraalVM container images - https://docs.oracle.com/en/graalvm/jdk/21/docs/getting-started/container-images/
- Oracle Container Registry repository detail: Oracle Linux - https://container-registry.oracle.com/ords/ocr/ba/os/oraclelinux
- Oracle Container Registry repository detail: Oracle Database Express Edition - https://container-registry.oracle.com/ords/ocr/ba/database/express

## Issues Found
- The Oracle Linux 9 install command used `podman-compose` from the default repositories. Oracle's current docs recommend `container-tools`, and Oracle's separate Compose guidance shows `podman-compose` requires the developer EPEL repository. I changed the OL9 install command to `sudo dnf install -y container-tools`.
- The Oracle Linux 8 install flow used `dnf module enable` followed by individual package installation. Oracle's current Podman guide uses `sudo dnf module install -y container-tools:ol8`. I changed the command to match the supported install path.
- The registry configuration section implied Podman had to be manually configured to access Oracle Container Registry. Oracle's docs state Oracle Linux already configures Oracle Container Registry and Docker Hub as default unqualified search registries. I replaced the overwrite snippet with a verification command.
- The Oracle Container Registry login section omitted current authentication requirements for licensed images. Oracle documents using an Oracle Container Registry authentication token and, where required, accepting repository terms in the web UI first. I added that clarification.
- The build example for `myapp:latest` used a `curl`-based health check later in the article, but the earlier Containerfile did not install `curl`. I added `curl` to the package install line so the health check command works as written.
- The OCIR examples mixed the correct `<tenancy-namespace>` placeholder with an incorrect `my-tenancy` placeholder. OCIR image paths use the tenancy namespace. I corrected the push examples and the Quadlet `Image=` field to use `<region-key>.ocir.io/<tenancy-namespace>/...`.
- The OCIR login section omitted the required username format and auth token requirement. Oracle documents logging in with `<tenancy-namespace>/<username>` or `<tenancy-namespace>/<domain-name>/<username>` for federated users, plus an OCI auth token. I added that clarification.
- The Oracle Instant Client example used incorrect package names (`oracle-instantclient-release-el9`, `oracle-instantclient-basic`, `oracle-instantclient-sqlplus`) and an incorrect library path for `21/client64`. Oracle's current RPM installation docs use `oracle-release-el9` and versioned Instant Client RPM names. I changed the example to install `oracle-release-el9`, `oracle-instantclient19.27-basic`, and `oracle-instantclient19.27-sqlplus`, and updated `LD_LIBRARY_PATH` and `PATH` accordingly.
- The Oracle Instant Client example ran `python3 app.py` without installing Python. I added `python3` to the image install step.
- The conclusion referred to "SUSE BCI equivalents in Oracle Linux base images," which is not technically accurate in this context. I replaced that phrase with "Oracle Linux base images."
- The kernel check text claimed the commands verified Oracle Linux-specific kernel features, but the commands only show the running kernel version as reported by the host and Podman. I corrected the wording to reflect what the commands actually verify.

## Review Notes
- The post is technically sound after the corrections above.
- `container-registry.oracle.com/database/express:latest` is currently valid, but Oracle Container Registry shows it as the `21.3.0-xe` image and the tag has not changed recently. Pinning an explicit tag in a future revision would make the example less ambiguous.
- The Oracle Instant Client example now matches the currently documented RPM naming (`19.27`) as of 2026-05-07. This is version-specific and may need refresh if Oracle updates the repository package names later.
- OCI networking in practice also depends on VCN security lists or network security groups in addition to any host firewall rules. The post's `firewall-cmd` example is correct for the instance OS, but future revisions could mention the VCN-side requirement explicitly.

# Validation Summary: How to Use Portainer in Government and Compliance Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition / Portainer Server and Agent
- Docker Engine and `dockerd` daemon configuration
- Docker Engine API via Portainer's API gateway
- OAuth-based authentication and nginx reverse proxying
- TLS certificate management with OpenSSL
- FIPS cryptographic requirements and NIST guidance
- GitLab CI/CD and Trivy image scanning

## Sources Consulted
- Portainer install on Docker (BE): https://docs.portainer.io/sts/start/install/server/docker/linux
- Portainer CLI options: https://docs.portainer.io/sts/advanced/cli
- Portainer SSL certificates: https://docs.portainer.io/advanced/ssl
- Portainer authentication overview: https://docs.portainer.io/admin/settings/authentication
- Portainer OAuth authentication: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer auth/activity log streaming to SIEM: https://docs.portainer.io/sts/advanced/siem
- Portainer API overview and examples: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Official Portainer source for current CLI flag behavior: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Docker daemon reference: https://docs.docker.com/reference/cli/dockerd/
- Docker `userns-remap`: https://docs.docker.com/engine/security/userns-remap/
- Docker seccomp guidance: https://docs.docker.com/engine/security/seccomp/
- Docker image load: https://docs.docker.com/reference/cli/docker/image/load/
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- OpenSSL `req` command: https://docs.openssl.org/1.1.1/man1/req/
- OpenSSL FIPS documentation: https://docs.openssl.org/3.5/fips/
- OpenSSL FIPS module guide: https://docs.openssl.org/master/man7/fips_module/
- NIST FIPS 140-2 publication: https://csrc.nist.gov/pubs/fips/140-2/upd2/final

## Issues Found
- The compliance table claimed Portainer can force a password change on first login. Portainer's current docs instead describe a 12-character minimum initial admin password and a configurable internal password policy, so the table entry was corrected.
- The air-gapped install section used `latest` image tags and the deprecated `--no-analytics` flag. I changed the examples to current `:sts` tags and removed `--no-analytics`, which Portainer keeps only as a deprecated migration flag with no effect.
- The Docker hardening example wrote `/etc/docker/daemon.json` without elevated shell redirection. I changed it to `sudo tee ... > /dev/null` so the command works as shown for non-root users.
- The Docker hardening example referenced `/etc/docker/seccomp-profile.json` without providing that file. I removed that setting because the snippet was incomplete as written, and Docker documents the built-in seccomp profile as the default baseline.
- The TLS section implied that generating a self-signed certificate makes the deployment FIPS-compliant. I changed it to generate a CSR for agency PKI issuance and updated the explanation to reflect that FIPS compliance depends on validated cryptographic modules and approved algorithms, not just certificate generation.
- The TLS run command used deprecated Portainer flags (`--ssl`, `--sslcert`, `--sslkey`). I replaced them with current `--tlscert` and `--tlskey` usage and kept `--http-disabled`.
- The authentication section instructed readers to configure SAML, but Portainer's current official authentication docs cover LDAP, Active Directory, and OAuth. I corrected the example to OAuth with an external IdP that enforces CAC/PIV upstream.
- The nginx example implied that passing certificate CN headers would authenticate users inside Portainer. I removed that implication and clarified that client-cert validation at the proxy only gates access to the UI; Portainer auth still needs LDAP, AD, or OAuth.
- The audit export script used an undocumented `api/useractivity` flow instead of Portainer's documented SIEM integration. I replaced it with Portainer's built-in auth/activity log streaming approach over syslog.
- The STIG scan script was broken because it never wrote `/tmp/containers.json`, then tried to read it. It also relied on `HostConfig` fields from the container list response. I rewrote it to use Portainer's documented Docker API gateway pattern and per-container inspect calls.
- The GitLab CI snippet claimed signed commits were part of the example, but the YAML did not enforce that. I changed the description to protected branches and manual approvals, removed the unused `approve` stage, and tightened the example slightly.
- The conclusion used the outdated "Enterprise Edition" product name and overstated compliance coverage. I updated it to "Business Edition" and changed "satisfy" to "help satisfy".

## Review Notes
- Portainer's documentation is internally inconsistent in a couple of places: the TLS flag migration is documented in release notes and source, while some SSL docs still show older flag names; the SIEM page lists `--syslog-address` in the table but shows `--syslog-addr` in the example. The post was aligned to current Portainer behavior where it could be confirmed, and to the working-style example syntax for SIEM logging.
- Portainer's SIEM/syslog log streaming is documented as experimental. That caveat remains important for government production deployments.
- Docker documents `userns-remap` as best enabled on new installations, and Docker's containerd image store is not available when `userns-remap` is enabled. Teams using newer Docker defaults should validate that combination before standardizing the daemon settings.

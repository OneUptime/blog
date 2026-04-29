# Validation Summary: How to Configure Jenkins to Run on IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins
- Jenkins agents / Remoting / WebSocket transport
- Java networking system properties
- IPv6
- Docker Engine and Docker Compose networking
- Linux networking tools (`ss`, `netstat`, `curl`, `ping`, `sysctl`)
- Jenkins Pipeline / Groovy

## Sources Consulted
- Jenkins documentation: Managing systemd services — https://www.jenkins.io/doc/book/system-administration/systemd-services/
- Jenkins documentation: Initial Settings / networking command line parameters — https://www.jenkins.io/doc/book/installing/initial-settings/
- Jenkins documentation: Configuring the System / Jenkins location — https://www.jenkins.io/doc/book/managing/system-configuration/
- Jenkins documentation: Exposed Services and Ports — https://www.jenkins.io/doc/book/security/services/
- Jenkins documentation: Managing Nodes — https://www.jenkins.io/doc/book/managing/nodes/
- Jenkins Remoting project page — https://www.jenkins.io/projects/remoting/
- Jenkins documentation: Java Support Policy — https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Oracle Java networking properties — https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- Docker documentation: Use IPv6 networking — https://docs.docker.com/engine/daemon/ipv6/
- Docker documentation: Port publishing and mapping — https://docs.docker.com/engine/network/port-publishing/
- Docker Compose file reference: services / ports — https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference: networks / `enable_ipv6` — https://docs.docker.com/reference/compose-file/networks/
- Docker Compose file reference: version top-level element (obsolete) — https://docs.docker.com/reference/compose-file/version-and-name/
- Local CLI help output: `ss --help`, `curl --help all`, `ping -h`

## Issues Found
1. The legacy `/etc/default/jenkins` example was misleading for current official Jenkins Linux packaging. Current official packages document `systemd` overrides as the primary mechanism, so the explicit legacy block was replaced with a generic note for older SysV-init-based packages.

2. The post implied that changing the listener address was sufficient for agent connectivity. Jenkins official docs state that listener parameters do not change the root URL advertised in inbound agent files, so a note was added to set the Jenkins URL in **Manage Jenkins** -> **System** to an IPv6-reachable URL.

3. Multiple examples used invalid IPv6 literals like `2001:db8::jenkins` and `2001:db8:1:1::jenkins`. IPv6 literals cannot contain hostnames, so they were replaced with valid documentation addresses.

4. The agent section mixed outdated and inaccurate concepts: it referred to agents connecting to the "master" via JNLP over TCP while the actual launch command used `-webSocket`. It was corrected to current Jenkins terminology: controller/inbound agent, Jenkins Remoting, and TCP or WebSocket transport as appropriate.

5. The Pipeline snippet in the agent section incorrectly suggested that setting `JAVA_OPTS` inside a `Jenkinsfile` would force the running Jenkins agent JVM to use IPv6. That environment block was removed because it only affects subprocess environment variables in the job, not the already-running Jenkins Remoting JVM.

6. The connectivity test used `ping6`, which is less portable on current Linux systems than the documented `ping -6` form. It was updated accordingly.

7. The Docker section had several correctness issues. The section title referred to an "agent" even though the example was a Jenkins controller container, the top-level Compose `version` field is now obsolete, the IPv6 subnet `2001:db8:jenkins::/64` was invalid, and the example did not pass `JENKINS_OPTS` explicitly for IPv6 listener binding. These points were corrected, and the image tag was updated to a current official Jenkins image.

8. The dependency download example claimed to fall back to IPv4 if IPv6 failed, but the original commands always ran the second `curl` regardless of the first command's success and did not force IPv4. It was corrected to `curl -6 ... || curl -4 ...`.

9. The troubleshooting section said "Ensure you have JDK 11+ for best IPv6 support," which is stale for modern Jenkins support policy, and it used `java -cp . TestIPv6.class`, which is not a valid `java` invocation. Both were corrected.

## Review Notes
- The examples intentionally use `2001:db8::/32` documentation addresses. They are syntactically valid but not routable; readers still need to replace them with real IPv6 addresses or a ULA subnet in production.
- Docker bridge-network IPv6 support is documented for Linux hosts. The post now notes that limitation, but readers on Docker Desktop or non-Linux container hosts may still need platform-specific networking adjustments.
- If an installation standardizes on WebSocket agents only, port `50000` does not need to be exposed. The post still shows it because Jenkins can also use the dedicated TCP inbound agent port.

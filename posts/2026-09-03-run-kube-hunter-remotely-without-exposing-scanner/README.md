# Run kube-hunter Remotely Without Exposing the Scanner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Network Security, Security

Description: Run kube-hunter from a controlled network location with outbound-only connectivity, bounded targets, reproducible evidence, and no new public scanner endpoint.

---

kube-hunter's remote mode needs a route **from the scanner to the targets**. It does not require an inbound listener, a public IP, or a Service in the target cluster. That distinction is the key to getting an attacker's-eye view without turning the scanner into another exposed asset.

The upstream documentation defines `--remote` for one or more IP addresses or DNS names. Current source shows that host discovery then tests a fixed set of Kubernetes-associated ports. Treat that list as implementation detail: record the exact kube-hunter revision used, because future releases can change it.

## Choose the Observation Point First

The result describes what is reachable **from the scanner's network position**, not an absolute property of the cluster. Pick a location that represents the threat you want to measure:

- an isolated internet-connected runner for public exposure;
- a hardened bastion in a peered security VPC/VNet for corporate-network exposure;
- a short-lived CI runner in the cluster network for private exposure.

Do not add a public IP or broad inbound rule to make the test work. Instead, place an ephemeral runner on an already approved connected network. Its security group or host firewall should deny unsolicited inbound traffic and allow only the outbound destinations and ports approved for the assessment.

## Freeze Scope and Authorization

Before scanning, write down the cluster identifier, target names or addresses, source egress IP, maintenance window, approver, and stop conditions. A DNS name can resolve to changing addresses, so capture resolution immediately before the run:

~~~bash
TARGET=api.example.invalid
date -u
getent ahosts "$TARGET" || nslookup "$TARGET"
~~~

Confirm that every resulting address belongs to the authorized cluster. Avoid a wide `--cidr` when a small set of explicit hosts answers the question. kube-hunter accepts multiple values after `--remote`, so explicit targets are straightforward.

## Run Without Publishing the Scanner

Use a pinned image digest from a registry your organization trusts. The placeholder below is intentionally not a real digest; resolve and approve one before execution.

~~~bash
TARGET=203.0.113.10
IMAGE='aquasec/kube-hunter@sha256:<approved-digest>'

docker run --rm \
  --read-only \
  --cap-drop ALL \
  --network bridge \
  "$IMAGE" --remote "$TARGET" --report json \
  > kube-hunter.json
~~~

This publishes no Docker port and does not use host networking. The process initiates outbound connections through Docker's bridge. If policy requires a proxy or a dedicated network namespace, implement that at the runner layer and verify that the target sees the expected source address.

Start with passive behavior: omit `--active`. Upstream explicitly warns that active hunters may change cluster state and can be harmful. `--report json` changes reporting, not scan behavior. Keep operational logs separate if you use `--log-file`; protect both artifacts because results may disclose internal addresses and weaknesses.

## Apply Egress Controls

Enforce the target boundary outside the tool as well as in its arguments. For example, attach the runner to a security group that permits outbound traffic only to approved cluster address ranges. Kubernetes NetworkPolicy applies to Pods and depends on the network plugin; it is not a substitute for a cloud firewall around a VM-based scanner.

Do not allow inbound SSH from the internet just to retrieve results. Prefer your CI artifact channel, an authenticated session-management service, or encrypted object storage with short retention. Remove the runner when evidence upload succeeds.

## Prove the Path Before Interpreting Results

Capture route and TLS-level observations without treating them as vulnerability proof:

~~~bash
ip route get 203.0.113.10
timeout 5 openssl s_client \
  -connect 203.0.113.10:6443 \
  -servername api.example.invalid </dev/null
~~~

A timeout can mean routing, firewall, DNS, or return-path failure. A successful TCP or TLS handshake proves reachability only. kube-hunter's report separates discovered `services` from `vulnerabilities`; an open service row is not automatically exploitable.

## Make the Run Reproducible

Store these together:

- UTC start and end time;
- kube-hunter image digest or source commit;
- exact command with secrets redacted;
- scanner subnet and observed egress address;
- DNS answers and target inventory;
- JSON report and exit status;
- relevant firewall rule revision.

Do not put bearer tokens in command logs. Remote unauthenticated testing normally needs no kubeconfig. The current `--service-account-token` option accepts the JWT value directly, so the secret is present in the process argument list. Avoid that option on shared runners. If an authenticated assessment is separately approved, use a disposable single-tenant executor, suppress shell tracing, restrict process inspection, and destroy the executor afterward.

Finally, destroy the runner or revoke its role and egress rule. Verify there is no leftover public address, firewall exception, credential, disk, or artifact URL. The clean-up evidence is part of the assessment.

## Verify the Vantage Point

Ask the target-side network owner to confirm the scanner's observed source address in flow or firewall logs. This catches unexpected NAT, proxying, or split routing that could make a supposedly external scan originate from a trusted range. Record whether each connection was accepted, rejected, or timed out. Without that check, a technically successful run may describe the runner platform's private path rather than the attacker position named in the assessment.

## Conclusion

Safe remote scanning is mainly a network-placement exercise. Put a disposable, inbound-closed runner at the observation point you intend to test, restrict its outbound scope, use explicit `--remote` targets, remain passive by default, and preserve enough network context to explain the result. You gain a meaningful external view without opening either the cluster or the scanner for convenience.

## Official References

- [kube-hunter documentation: scanning, active hunting, output, and deployment](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter argument parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter port discovery source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)

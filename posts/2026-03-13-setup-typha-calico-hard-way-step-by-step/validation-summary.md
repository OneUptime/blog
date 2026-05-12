# Validation Summary: How to Set Up Typha in a Calico Hard Way Installation Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (v3.27.0)
- Typha
- Felix
- Kubernetes (RBAC, Deployments, Services, Secrets)
- kubectl
- calicoctl
- OpenSSL (TLS / mTLS certificates)
- Prometheus metrics

## Sources Consulted
- Calico Typha documentation: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration env vars: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Typha source / Helm chart manifests: https://github.com/projectcalico/calico (libcalico-go FelixConfigurationSpec types — `TyphaK8sServiceName`, `TyphaK8sNamespace`, `TyphaCAFile`, `TyphaCertFile`, `TyphaKeyFile`)
- Calico self-managed / "hard way" install manifests (calico.yaml) for Typha Deployment + Service shape
- Kubernetes RBAC and Service selector documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- OpenSSL `req` / `x509` man pages for the cert generation commands

## Issues Found

1. **Service selector did not match Deployment pod labels** (Step 3). The Service selector was `app: calico-typha`, but the Deployment's pod template labels are `k8s-app: calico-typha`. With the original selector, the Service would resolve to zero endpoints and Felix would never connect. Changed the Service selector to `k8s-app: calico-typha` to match the pod label used elsewhere in the manifest (this is also the label used by Calico's upstream manifests).

2. **Typo `tymphaCertFile`** in the FelixConfiguration patch (Step 4). This is not a valid field — corrected to `typhaCertFile` (matches the `TyphaCertFile` JSON tag in libcalico-go's FelixConfigurationSpec).

3. **Incorrect casing on `typhak8sServiceName` / `typhak8sNamespace`** in the FelixConfiguration patch (Step 4). Calico's FelixConfiguration CRD serializes these fields as `typhaK8sServiceName` and `typhaK8sNamespace` (capital K, following Go's `TyphaK8sServiceName` / `TyphaK8sNamespace` field names). With lowercase `k`, the patch would either fail strict schema validation or silently set unknown fields. Corrected both.

## Review Notes

- The post deploys Typha into the `calico-system` namespace. Strictly speaking, `calico-system` is the namespace the Tigera Operator creates; classic manifest-based ("hard way") installs traditionally use `kube-system`. The post is internally consistent (the ServiceAccount, Secrets, Deployment, and Service all live in `calico-system`), and there is nothing preventing a manual installer from choosing `calico-system` — they just have to create the namespace first. Worth noting as a caveat for readers.
- `TYPHA_PROMETHEUSMETRICSPORT` is set to `"9093"`, which is the documented default — explicit is fine.
- Felix's mTLS client certs need to be mounted at `/felix-tls/` on each Felix pod/node; the post correctly references that path in FelixConfiguration but leaves the mechanics of mounting the `calico-felix-typha-tls` secret on Felix to the reader. Since the prereqs state Felix is already running, that's a reasonable scope choice but readers running Felix as a DaemonSet will need to also patch their Felix DaemonSet to mount that secret.
- The OpenSSL commands skip an explicit `-CN` SAN extension on the server cert. Typha/Felix use CN-based identity (`TyphaCN` / `FelixCN`) rather than SAN by default, so this is acceptable, but modern OpenSSL/Go versions are trending toward SAN-required verification — readers on newer toolchains may want to add `-addext "subjectAltName=DNS:calico-typha,DNS:calico-typha.calico-system.svc"`.
- The Deployment runs a single replica. For production, Calico's docs recommend 3+ Typha replicas with anti-affinity. The conclusion alludes to scaling, which is appropriate for a step-by-step intro.
- Calico v3.27.0 is current-enough as of the post's date and is a real, valid tag for `calico/typha`.

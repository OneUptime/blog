# How to Write Kyverno Validate Policies for Pod Security Standards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Security, Pod Security, Admission Control

Description: Learn how to write Kyverno validation policies that enforce Kubernetes Pod Security Standards, implement baseline and restricted policies, and automate security compliance checks for your cluster workloads.

---

Pod Security Standards define three security profiles for Kubernetes workloads: privileged, baseline, and restricted. While Kubernetes provides built-in Pod Security Admission, Kyverno offers a more flexible, customizable approach to enforcing these standards through declarative policies. This guide shows you how to write effective Kyverno validation policies that align with Pod Security Standards.

## Understanding Pod Security Standards

The Kubernetes Pod Security Standards define security controls at three levels. The privileged profile is unrestricted and allows all pod configurations. The baseline profile prevents the most dangerous security issues while maintaining usability. The restricted profile enforces current pod hardening best practices.

Kyverno lets you implement these standards through policies that validate pod configurations at admission time. When a pod violates a policy, Kyverno blocks its creation and provides clear error messages to developers.

## Installing Kyverno

Before writing policies, install Kyverno in your cluster using Helm:

```bash
# Add the Kyverno Helm repository
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update

# Install Kyverno in the kyverno namespace
helm install kyverno kyverno/kyverno -n kyverno --create-namespace

# Verify the installation
kubectl get pods -n kyverno
```

Wait for all Kyverno pods to be running before applying policies.

## Writing a Basic Validation Policy

Start with a simple policy that prevents containers from running as root. This is a core requirement of the restricted Pod Security Standard:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-run-as-nonroot
  annotations:
    policies.kyverno.io/title: Require runAsNonRoot
    policies.kyverno.io/category: Pod Security Standards (Baseline)
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Containers must run as non-root users to reduce the impact of
      container compromises.
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-runAsNonRoot
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >-
          Running as root is not allowed. Set runAsNonRoot to true
          in securityContext.
        pattern:
          spec:
            =(ephemeralContainers):
              - =(securityContext):
                  =(runAsNonRoot): true
            =(initContainers):
              - =(securityContext):
                  =(runAsNonRoot): true
            containers:
              - =(securityContext):
                  =(runAsNonRoot): true
```

The `validationFailureAction: Enforce` setting blocks non-compliant pods. Set it to `Audit` during testing to log violations without blocking. The `background: true` setting enables scanning of existing resources.

The pattern uses wildcards with `=()` to make fields optional. This accounts for pods that might not define init containers or ephemeral containers.

## Enforcing Capability Restrictions

The baseline profile restricts dangerous Linux capabilities. Write a policy that prevents adding capabilities beyond the safe set:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-capabilities
  annotations:
    policies.kyverno.io/title: Restrict Capabilities
    policies.kyverno.io/category: Pod Security Standards (Baseline)
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-capabilities
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >-
          Only the capabilities NET_BIND_SERVICE, CHOWN, DAC_OVERRIDE,
          SETGID, SETUID, and FOWNER may be added.
        foreach:
          - list: "request.object.spec.[ephemeralContainers, initContainers, containers][]"
            deny:
              conditions:
                any:
                  - key: "{{ element.securityContext.capabilities.add[] || '' }}"
                    operator: AnyNotIn
                    value:
                      - NET_BIND_SERVICE
                      - CHOWN
                      - DAC_OVERRIDE
                      - SETGID
                      - SETUID
                      - FOWNER
                      - ""
```

This policy uses `foreach` to iterate over all container types. The `deny.conditions` block checks if any added capability is outside the allowed list.

## Validating Host Path Restrictions

Baseline policies prevent mounting sensitive host paths. Create a policy that blocks dangerous volume mounts:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-hostpath-volumes
  annotations:
    policies.kyverno.io/title: Restrict HostPath Volumes
    policies.kyverno.io/category: Pod Security Standards (Baseline)
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-hostpath
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >-
          HostPath volumes are forbidden. Use PersistentVolumes instead.
        pattern:
          spec:
            =(volumes):
              - X(hostPath): "null"
```

The `X(hostPath)` syntax with "null" means the hostPath field must not exist. This prevents all hostPath volume usage.

## Implementing Restricted Profile Requirements

The restricted profile adds more stringent requirements. Write a policy that enforces all seccomp, AppArmor, and SELinux settings:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-seccomp-strict
  annotations:
    policies.kyverno.io/title: Restrict Seccomp (Strict)
    policies.kyverno.io/category: Pod Security Standards (Restricted)
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-seccomp
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >-
          Seccomp profile must be RuntimeDefault or Localhost.
        anyPattern:
          - spec:
              securityContext:
                seccompProfile:
                  type: RuntimeDefault
              containers:
                - =(securityContext):
                    =(seccompProfile):
                      =(type): RuntimeDefault | Localhost
          - spec:
              securityContext:
                seccompProfile:
                  type: Localhost
              containers:
                - =(securityContext):
                    =(seccompProfile):
                      =(type): RuntimeDefault | Localhost
```

The `anyPattern` block allows either RuntimeDefault or Localhost at the pod level, while containers can override with either type.

## Combining Multiple Rules in One Policy

Group related checks into a single ClusterPolicy for easier management:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pss-baseline-bundle
  annotations:
    policies.kyverno.io/title: Pod Security Standards (Baseline)
    policies.kyverno.io/category: Pod Security Standards (Baseline)
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: host-namespaces
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Sharing host namespaces is not allowed."
        pattern:
          spec:
            =(hostNetwork): false
            =(hostPID): false
            =(hostIPC): false

    - name: privileged-containers
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Privileged containers are not allowed."
        pattern:
          spec:
            =(ephemeralContainers):
              - =(securityContext):
                  =(privileged): false
            =(initContainers):
              - =(securityContext):
                  =(privileged): false
            containers:
              - =(securityContext):
                  =(privileged): false

    - name: host-ports
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Using host ports is not allowed."
        pattern:
          spec:
            =(ephemeralContainers):
              - =(ports):
                  - X(hostPort): 0
            =(initContainers):
              - =(ports):
                  - X(hostPort): 0
            containers:
              - =(ports):
                  - X(hostPort): 0
```

This bundle policy includes three related checks in one resource, making it easier to apply and manage Pod Security Standards.

## Testing Validation Policies

Test policies before enforcing them cluster-wide. Create test pods that should fail:

```yaml
# This pod should be blocked
apiVersion: v1
kind: Pod
metadata:
  name: test-privileged
spec:
  containers:
    - name: nginx
      image: nginx:1.21
      securityContext:
        privileged: true  # Violates policy
```

Apply the test pod:

```bash
kubectl apply -f test-pod.yaml
```

You should see an error message from Kyverno explaining the policy violation.

## Using Policy Reporters for Visibility

Install the Policy Reporter to get a dashboard of policy violations:

```bash
helm repo add policy-reporter https://kyverno.github.io/policy-reporter
helm install policy-reporter policy-reporter/policy-reporter -n policy-reporter --create-namespace
```

Access the dashboard to see which resources are violating policies and track compliance over time.

## Conclusion

Kyverno validation policies provide a powerful way to enforce Pod Security Standards in Kubernetes. Start with baseline policies to prevent critical security issues, then gradually implement restricted policies for production workloads. Use audit mode during rollout to identify violations without breaking existing applications. Combine related checks into bundled policies for easier management, and leverage Policy Reporter for visibility into your security posture.

By implementing these validation policies, you create guardrails that prevent insecure configurations while providing clear feedback to developers about required security settings.

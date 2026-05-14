# Validation Summary: How to Automate Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Typha
- Kubernetes CronJob
- Kubernetes RBAC
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- kubectl
- Ansible
- PodDisruptionBudget
- Prometheus metrics

## Sources Consulted
- Calico documentation: Install Typha, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Installing on on-premises deployments, https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico documentation: Typha overview, https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico documentation: Configuring Typha, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: Monitoring Typha with Prometheus, https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: Horizontal Pod Autoscaling, https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes documentation: HorizontalPodAutoscaler walkthrough, https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes kubectl reference: exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl reference: scale, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes documentation: RBAC authorization, https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Ansible documentation: ansible.builtin.command, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.shell, https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible documentation: kubernetes.core.k8s_scale, https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_scale_module.html

## Issues Found
- The examples used the `calico-system` namespace, but Calico's current hard-way Typha installation places `calico-typha` in `kube-system`. Updated the ServiceAccount, CronJobs, HPA, kubectl commands, Ansible scaling task, and PodDisruptionBudget to use `kube-system`.
- The replica calculation did not match Calico's documented guidance. Calico recommends at least one Typha replica per 200 nodes, no more than 20 replicas, a production minimum of three replicas, and fewer Typha replicas than nodes. Updated the CronJob and Ansible formula to follow those constraints.
- The HPA example used `minReplicas: 1`, which undermines the HA goal and conflicts with Calico's production minimum recommendation. Updated it to `minReplicas: 3`.
- The HPA and failover sections did not mention that Typha Prometheus metrics are disabled by default, and the HPA section did not mention that custom metrics require the Kubernetes custom metrics API. Added short prerequisite sentences.
- The RBAC role did not grant permissions needed by the failover test CronJob, which lists and deletes pods and uses `kubectl exec`. Added `pods` and `pods/exec` rules.
- The failover metric parsing matched Prometheus HELP and TYPE lines as well as sample lines. Tightened the `awk` match to only sum `typha_connections_active` samples.
- The Ansible playbook used the `command` module with a shell pipe. Ansible's `command` module does not process shell metacharacters such as `|`. Changed the task to `ansible.builtin.shell` and marked it unchanged with `changed_when: false`.

## Review Notes
- `kubectl` is not installed in this workspace, so CLI dry-run validation could not be performed locally. The manifests and commands were reviewed against official Kubernetes, Calico, and Ansible documentation.
- The examples still assume the Typha metrics endpoint is reachable from the test job and that the kubectl image includes the shell utilities used in the snippets. In a production implementation, pinning the kubectl image tag and using a purpose-built test image would make the automation more reproducible.

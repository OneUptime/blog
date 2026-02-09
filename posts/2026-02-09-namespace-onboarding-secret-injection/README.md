# How to Build Namespace Onboarding Workflows with Automated Secret Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Namespaces, Security

Description: Learn how to automate namespace onboarding in Kubernetes with automated secret injection, RBAC configuration, and resource quota setup for streamlined multi-tenant environments.

---

Managing multi-tenant Kubernetes clusters requires a standardized process for onboarding new teams and applications. Manual namespace setup is error-prone and time-consuming, especially when you need to configure secrets, service accounts, network policies, and resource quotas for each new namespace. Automating this onboarding process ensures consistency, security, and faster time-to-deployment.

Automated secret injection is particularly critical because applications typically need access to credentials for databases, APIs, registries, and other external services. Manually creating secrets for each namespace introduces security risks and operational overhead.

## Understanding Namespace Onboarding Requirements

A complete namespace onboarding workflow typically includes creating the namespace itself, setting up RBAC policies and service accounts, injecting required secrets and config maps, configuring resource quotas and limit ranges, applying network policies for isolation, setting up monitoring and logging configurations, and registering the namespace with service meshes or ingress controllers.

## Building a Namespace Onboarding Controller

Let's build a Kubernetes controller that watches for new namespaces with specific labels and automatically provisions all required resources:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    networkingv1 "k8s.io/api/networking/v1"
    rbacv1 "k8s.io/api/rbac/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/informers"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/cache"
)

const (
    onboardingLabel = "onboarding.example.com/enabled"
    teamLabel       = "onboarding.example.com/team"
    envLabel        = "onboarding.example.com/environment"
)

type NamespaceOnboarder struct {
    clientset *kubernetes.Clientset
}

func NewNamespaceOnboarder() (*NamespaceOnboarder, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &NamespaceOnboarder{
        clientset: clientset,
    }, nil
}

func (no *NamespaceOnboarder) Run(ctx context.Context) error {
    factory := informers.NewSharedInformerFactory(no.clientset, time.Minute*5)
    nsInformer := factory.Core().V1().Namespaces()

    nsInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            ns := obj.(*corev1.Namespace)
            no.handleNamespaceAdd(ctx, ns)
        },
    })

    factory.Start(ctx.Done())
    factory.WaitForCacheSync(ctx.Done())

    <-ctx.Done()
    return nil
}

func (no *NamespaceOnboarder) handleNamespaceAdd(ctx context.Context, ns *corev1.Namespace) {
    // Check if namespace has onboarding label
    if ns.Labels[onboardingLabel] != "true" {
        return
    }

    // Check if already onboarded
    if ns.Annotations["onboarding.example.com/status"] == "completed" {
        return
    }

    fmt.Printf("Onboarding namespace: %s\n", ns.Name)

    // Execute onboarding steps
    if err := no.onboardNamespace(ctx, ns); err != nil {
        fmt.Printf("Failed to onboard namespace %s: %v\n", ns.Name, err)
        no.markOnboardingFailed(ctx, ns, err)
        return
    }

    no.markOnboardingCompleted(ctx, ns)
    fmt.Printf("Successfully onboarded namespace: %s\n", ns.Name)
}

func (no *NamespaceOnboarder) onboardNamespace(ctx context.Context, ns *corev1.Namespace) error {
    // Step 1: Create service accounts
    if err := no.createServiceAccounts(ctx, ns); err != nil {
        return fmt.Errorf("failed to create service accounts: %w", err)
    }

    // Step 2: Setup RBAC
    if err := no.setupRBAC(ctx, ns); err != nil {
        return fmt.Errorf("failed to setup RBAC: %w", err)
    }

    // Step 3: Inject secrets
    if err := no.injectSecrets(ctx, ns); err != nil {
        return fmt.Errorf("failed to inject secrets: %w", err)
    }

    // Step 4: Create config maps
    if err := no.createConfigMaps(ctx, ns); err != nil {
        return fmt.Errorf("failed to create config maps: %w", err)
    }

    // Step 5: Setup resource quotas
    if err := no.setupResourceQuotas(ctx, ns); err != nil {
        return fmt.Errorf("failed to setup resource quotas: %w", err)
    }

    // Step 6: Apply network policies
    if err := no.applyNetworkPolicies(ctx, ns); err != nil {
        return fmt.Errorf("failed to apply network policies: %w", err)
    }

    // Step 7: Setup limit ranges
    if err := no.setupLimitRanges(ctx, ns); err != nil {
        return fmt.Errorf("failed to setup limit ranges: %w", err)
    }

    return nil
}

func (no *NamespaceOnboarder) createServiceAccounts(ctx context.Context, ns *corev1.Namespace) error {
    serviceAccounts := []string{"app-deployer", "app-runner", "job-runner"}

    for _, saName := range serviceAccounts {
        sa := &corev1.ServiceAccount{
            ObjectMeta: metav1.ObjectMeta{
                Name:      saName,
                Namespace: ns.Name,
                Labels: map[string]string{
                    "managed-by": "namespace-onboarder",
                },
            },
        }

        _, err := no.clientset.CoreV1().ServiceAccounts(ns.Name).Create(ctx, sa, metav1.CreateOptions{})
        if err != nil && !errors.IsAlreadyExists(err) {
            return err
        }
    }

    return nil
}

func (no *NamespaceOnboarder) setupRBAC(ctx context.Context, ns *corev1.Namespace) error {
    team := ns.Labels[teamLabel]
    if team == "" {
        return fmt.Errorf("team label not found")
    }

    // Create role for developers
    role := &rbacv1.Role{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "developer",
            Namespace: ns.Name,
        },
        Rules: []rbacv1.PolicyRule{
            {
                APIGroups: []string{"", "apps", "batch"},
                Resources: []string{"pods", "deployments", "jobs", "services", "configmaps"},
                Verbs:     []string{"get", "list", "watch", "create", "update", "patch"},
            },
            {
                APIGroups: []string{""},
                Resources: []string{"pods/log", "pods/exec"},
                Verbs:     []string{"get", "list"},
            },
        },
    }

    _, err := no.clientset.RbacV1().Roles(ns.Name).Create(ctx, role, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    // Create role binding for team
    roleBinding := &rbacv1.RoleBinding{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "developer-binding",
            Namespace: ns.Name,
        },
        Subjects: []rbacv1.Subject{
            {
                Kind: "Group",
                Name: fmt.Sprintf("team-%s", team),
            },
        },
        RoleRef: rbacv1.RoleRef{
            APIGroup: "rbac.authorization.k8s.io",
            Kind:     "Role",
            Name:     "developer",
        },
    }

    _, err = no.clientset.RbacV1().RoleBindings(ns.Name).Create(ctx, roleBinding, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) injectSecrets(ctx context.Context, ns *corev1.Namespace) error {
    environment := ns.Labels[envLabel]
    if environment == "" {
        environment = "development"
    }

    // Inject image pull secret
    if err := no.injectImagePullSecret(ctx, ns); err != nil {
        return err
    }

    // Inject database credentials
    if err := no.injectDatabaseSecret(ctx, ns, environment); err != nil {
        return err
    }

    // Inject API keys
    if err := no.injectAPIKeys(ctx, ns, environment); err != nil {
        return err
    }

    // Inject TLS certificates
    if err := no.injectTLSCertificates(ctx, ns); err != nil {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) injectImagePullSecret(ctx context.Context, ns *corev1.Namespace) error {
    // Copy image pull secret from a central namespace
    sourceSecret, err := no.clientset.CoreV1().Secrets("kube-system").Get(
        ctx,
        "registry-credentials",
        metav1.GetOptions{},
    )
    if err != nil {
        return err
    }

    targetSecret := &corev1.Secret{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "registry-credentials",
            Namespace: ns.Name,
            Labels: map[string]string{
                "managed-by": "namespace-onboarder",
            },
        },
        Type: sourceSecret.Type,
        Data: sourceSecret.Data,
    }

    _, err = no.clientset.CoreV1().Secrets(ns.Name).Create(ctx, targetSecret, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) injectDatabaseSecret(ctx context.Context, ns *corev1.Namespace, env string) error {
    // In a real implementation, fetch credentials from a secrets manager
    secret := &corev1.Secret{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "database-credentials",
            Namespace: ns.Name,
            Labels: map[string]string{
                "managed-by": "namespace-onboarder",
            },
        },
        Type: corev1.SecretTypeOpaque,
        StringData: map[string]string{
            "host":     fmt.Sprintf("postgres-%s.example.com", env),
            "port":     "5432",
            "database": ns.Name,
            "username": fmt.Sprintf("%s_user", ns.Name),
            "password": generateSecurePassword(),
        },
    }

    _, err := no.clientset.CoreV1().Secrets(ns.Name).Create(ctx, secret, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) injectAPIKeys(ctx context.Context, ns *corev1.Namespace, env string) error {
    secret := &corev1.Secret{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "api-keys",
            Namespace: ns.Name,
            Labels: map[string]string{
                "managed-by": "namespace-onboarder",
            },
        },
        Type: corev1.SecretTypeOpaque,
        StringData: map[string]string{
            "external-api-key":    generateAPIKey(),
            "monitoring-api-key":  generateAPIKey(),
            "logging-api-key":     generateAPIKey(),
        },
    }

    _, err := no.clientset.CoreV1().Secrets(ns.Name).Create(ctx, secret, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) injectTLSCertificates(ctx context.Context, ns *corev1.Namespace) error {
    // Copy wildcard certificate
    sourceCert, err := no.clientset.CoreV1().Secrets("kube-system").Get(
        ctx,
        "wildcard-tls-cert",
        metav1.GetOptions{},
    )
    if err != nil {
        return err
    }

    targetCert := &corev1.Secret{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "tls-certificate",
            Namespace: ns.Name,
            Labels: map[string]string{
                "managed-by": "namespace-onboarder",
            },
        },
        Type: corev1.SecretTypeTLS,
        Data: sourceCert.Data,
    }

    _, err = no.clientset.CoreV1().Secrets(ns.Name).Create(ctx, targetCert, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) createConfigMaps(ctx context.Context, ns *corev1.Namespace) error {
    environment := ns.Labels[envLabel]

    configMap := &corev1.ConfigMap{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "app-config",
            Namespace: ns.Name,
            Labels: map[string]string{
                "managed-by": "namespace-onboarder",
            },
        },
        Data: map[string]string{
            "environment":     environment,
            "log-level":       getLogLevel(environment),
            "monitoring-url":  "http://prometheus.monitoring.svc.cluster.local:9090",
            "tracing-url":     "http://jaeger-collector.tracing.svc.cluster.local:14268",
        },
    }

    _, err := no.clientset.CoreV1().ConfigMaps(ns.Name).Create(ctx, configMap, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) setupResourceQuotas(ctx context.Context, ns *corev1.Namespace) error {
    environment := ns.Labels[envLabel]
    limits := getResourceLimits(environment)

    quota := &corev1.ResourceQuota{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "namespace-quota",
            Namespace: ns.Name,
        },
        Spec: corev1.ResourceQuotaSpec{
            Hard: corev1.ResourceList{
                corev1.ResourceRequestsCPU:    resource.MustParse(limits.CPU),
                corev1.ResourceRequestsMemory: resource.MustParse(limits.Memory),
                corev1.ResourcePods:           resource.MustParse(limits.Pods),
            },
        },
    }

    _, err := no.clientset.CoreV1().ResourceQuotas(ns.Name).Create(ctx, quota, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) applyNetworkPolicies(ctx context.Context, ns *corev1.Namespace) error {
    // Default deny all ingress
    denyAll := &networkingv1.NetworkPolicy{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "deny-all-ingress",
            Namespace: ns.Name,
        },
        Spec: networkingv1.NetworkPolicySpec{
            PodSelector: metav1.LabelSelector{},
            PolicyTypes: []networkingv1.PolicyType{
                networkingv1.PolicyTypeIngress,
            },
        },
    }

    _, err := no.clientset.NetworkingV1().NetworkPolicies(ns.Name).Create(ctx, denyAll, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    // Allow ingress from ingress controller
    allowIngress := &networkingv1.NetworkPolicy{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "allow-ingress",
            Namespace: ns.Name,
        },
        Spec: networkingv1.NetworkPolicySpec{
            PodSelector: metav1.LabelSelector{
                MatchLabels: map[string]string{
                    "app.kubernetes.io/component": "web",
                },
            },
            Ingress: []networkingv1.NetworkPolicyIngressRule{
                {
                    From: []networkingv1.NetworkPolicyPeer{
                        {
                            NamespaceSelector: &metav1.LabelSelector{
                                MatchLabels: map[string]string{
                                    "name": "ingress-nginx",
                                },
                            },
                        },
                    },
                },
            },
            PolicyTypes: []networkingv1.PolicyType{
                networkingv1.PolicyTypeIngress,
            },
        },
    }

    _, err = no.clientset.NetworkingV1().NetworkPolicies(ns.Name).Create(ctx, allowIngress, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) setupLimitRanges(ctx context.Context, ns *corev1.Namespace) error {
    limitRange := &corev1.LimitRange{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "default-limits",
            Namespace: ns.Name,
        },
        Spec: corev1.LimitRangeSpec{
            Limits: []corev1.LimitRangeItem{
                {
                    Type: corev1.LimitTypeContainer,
                    Default: corev1.ResourceList{
                        corev1.ResourceCPU:    resource.MustParse("500m"),
                        corev1.ResourceMemory: resource.MustParse("512Mi"),
                    },
                    DefaultRequest: corev1.ResourceList{
                        corev1.ResourceCPU:    resource.MustParse("100m"),
                        corev1.ResourceMemory: resource.MustParse("128Mi"),
                    },
                },
            },
        },
    }

    _, err := no.clientset.CoreV1().LimitRanges(ns.Name).Create(ctx, limitRange, metav1.CreateOptions{})
    if err != nil && !errors.IsAlreadyExists(err) {
        return err
    }

    return nil
}

func (no *NamespaceOnboarder) markOnboardingCompleted(ctx context.Context, ns *corev1.Namespace) error {
    ns.Annotations["onboarding.example.com/status"] = "completed"
    ns.Annotations["onboarding.example.com/completed-at"] = time.Now().Format(time.RFC3339)

    _, err := no.clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
    return err
}

func (no *NamespaceOnboarder) markOnboardingFailed(ctx context.Context, ns *corev1.Namespace, err error) error {
    ns.Annotations["onboarding.example.com/status"] = "failed"
    ns.Annotations["onboarding.example.com/error"] = err.Error()

    _, updateErr := no.clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
    return updateErr
}

// Helper functions
func generateSecurePassword() string {
    // Implement secure password generation
    return "changeme"
}

func generateAPIKey() string {
    // Implement API key generation
    return "api-key-placeholder"
}

func getLogLevel(env string) string {
    if env == "production" {
        return "info"
    }
    return "debug"
}

type ResourceLimits struct {
    CPU    string
    Memory string
    Pods   string
}

func getResourceLimits(env string) ResourceLimits {
    switch env {
    case "production":
        return ResourceLimits{CPU: "20", Memory: "40Gi", Pods: "50"}
    case "staging":
        return ResourceLimits{CPU: "10", Memory: "20Gi", Pods: "30"}
    default:
        return ResourceLimits{CPU: "5", Memory: "10Gi", Pods: "20"}
    }
}

func main() {
    onboarder, err := NewNamespaceOnboarder()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := onboarder.Run(ctx); err != nil {
        panic(err)
    }
}
```

Deploy the onboarder and test it by creating a namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha-dev
  labels:
    onboarding.example.com/enabled: "true"
    onboarding.example.com/team: "alpha"
    onboarding.example.com/environment: "development"
```

The controller will automatically provision all required resources, inject secrets, and configure the namespace for immediate use by the development team.

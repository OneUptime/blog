# How to Create Kubernetes Manifests Programmatically Using CDK8s with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CDK8s, Python, Kubernetes

Description: Learn how to generate Kubernetes manifests programmatically using CDK8s with Python, enabling type-safe infrastructure code with loops, conditions, and reusable components.

---

Writing YAML manifests manually gets tedious. You copy and paste configurations, manually update values, and hope you catch typos before deployment. CDK8s solves this by letting you generate manifests using real programming languages. With Python, you get loops, conditionals, functions, and all the tools you already know.

CDK8s synthesizes your Python code into standard Kubernetes YAML, so it works with any cluster. You write code once and generate manifests for different environments automatically.

## Setting Up CDK8s with Python

Install CDK8s CLI and create a Python project:

```bash
# Install CDK8s CLI
npm install -g cdk8s-cli

# Create new Python project
mkdir k8s-app && cd k8s-app
cdk8s init python-app

# This creates a virtual environment and installs dependencies
```

The project structure includes:

```
k8s-app/
├── main.py          # Your application code
├── cdk8s.yaml       # Project configuration
├── imports/         # Generated Kubernetes API types
└── dist/            # Synthesized YAML output
```

## Creating Your First Resources

Open main.py and create a deployment:

```python
#!/usr/bin/env python
from constructs import Construct
from cdk8s import App, Chart
from imports import k8s

class WebApp(Chart):
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id)

        # Create namespace
        namespace = k8s.KubeNamespace(
            self, 'namespace',
            metadata=k8s.ObjectMeta(
                name='production',
                labels={'environment': 'prod'}
            )
        )

        # Create deployment
        k8s.KubeDeployment(
            self, 'deployment',
            metadata=k8s.ObjectMeta(
                namespace='production',
                name='web-app',
                labels={'app': 'web'}
            ),
            spec=k8s.DeploymentSpec(
                replicas=3,
                selector=k8s.LabelSelector(
                    match_labels={'app': 'web'}
                ),
                template=k8s.PodTemplateSpec(
                    metadata=k8s.ObjectMeta(
                        labels={'app': 'web'}
                    ),
                    spec=k8s.PodSpec(
                        containers=[
                            k8s.Container(
                                name='web',
                                image='nginx:1.25',
                                ports=[k8s.ContainerPort(
                                    container_port=80,
                                    name='http'
                                )],
                                resources=k8s.ResourceRequirements(
                                    requests={
                                        'cpu': k8s.Quantity.from_string('100m'),
                                        'memory': k8s.Quantity.from_string('128Mi')
                                    },
                                    limits={
                                        'cpu': k8s.Quantity.from_string('500m'),
                                        'memory': k8s.Quantity.from_string('512Mi')
                                    }
                                ),
                                liveness_probe=k8s.Probe(
                                    http_get=k8s.HttpGetAction(
                                        path='/health',
                                        port=k8s.IntOrString.from_number(80)
                                    ),
                                    initial_delay_seconds=10,
                                    period_seconds=5
                                )
                            )
                        ]
                    )
                )
            )
        )

        # Create service
        k8s.KubeService(
            self, 'service',
            metadata=k8s.ObjectMeta(
                namespace='production',
                name='web-app',
                labels={'app': 'web'}
            ),
            spec=k8s.ServiceSpec(
                type='LoadBalancer',
                selector={'app': 'web'},
                ports=[k8s.ServicePort(
                    port=80,
                    target_port=k8s.IntOrString.from_number(80)
                )]
            )
        )

app = App()
WebApp(app, "webapp")
app.synth()
```

Generate manifests:

```bash
cdk8s synth
```

This creates dist/webapp.k8s.yaml with all resources. Python's type checking catches errors at development time instead of deployment.

## Building Reusable Components

Create reusable components using Python classes:

```python
# components/microservice.py
from constructs import Construct
from imports import k8s
from typing import Dict, Optional, List

class MicroserviceConfig:
    def __init__(
        self,
        namespace: str,
        image: str,
        replicas: int = 2,
        port: int = 8080,
        cpu_request: str = '100m',
        memory_request: str = '128Mi',
        env: Optional[Dict[str, str]] = None,
        health_path: str = '/health'
    ):
        self.namespace = namespace
        self.image = image
        self.replicas = replicas
        self.port = port
        self.cpu_request = cpu_request
        self.memory_request = memory_request
        self.env = env or {}
        self.health_path = health_path

class Microservice(Construct):
    def __init__(
        self,
        scope: Construct,
        id: str,
        config: MicroserviceConfig
    ):
        super().__init__(scope, id)

        labels = {'app': id}

        # Build environment variables
        env_vars = [
            k8s.EnvVar(name=k, value=v)
            for k, v in config.env.items()
        ]

        # Create deployment
        self.deployment = k8s.KubeDeployment(
            self, 'deployment',
            metadata=k8s.ObjectMeta(
                namespace=config.namespace,
                name=id,
                labels=labels
            ),
            spec=k8s.DeploymentSpec(
                replicas=config.replicas,
                selector=k8s.LabelSelector(match_labels=labels),
                template=k8s.PodTemplateSpec(
                    metadata=k8s.ObjectMeta(labels=labels),
                    spec=k8s.PodSpec(
                        containers=[
                            k8s.Container(
                                name=id,
                                image=config.image,
                                ports=[k8s.ContainerPort(
                                    container_port=config.port
                                )],
                                env=env_vars,
                                resources=k8s.ResourceRequirements(
                                    requests={
                                        'cpu': k8s.Quantity.from_string(config.cpu_request),
                                        'memory': k8s.Quantity.from_string(config.memory_request)
                                    },
                                    limits={
                                        'cpu': k8s.Quantity.from_string(self._scale_cpu(config.cpu_request)),
                                        'memory': k8s.Quantity.from_string(self._scale_memory(config.memory_request))
                                    }
                                ),
                                readiness_probe=k8s.Probe(
                                    http_get=k8s.HttpGetAction(
                                        path=config.health_path,
                                        port=k8s.IntOrString.from_number(config.port)
                                    ),
                                    initial_delay_seconds=5,
                                    period_seconds=10
                                )
                            )
                        ]
                    )
                )
            )
        )

        # Create service
        self.service = k8s.KubeService(
            self, 'service',
            metadata=k8s.ObjectMeta(
                namespace=config.namespace,
                name=id,
                labels=labels
            ),
            spec=k8s.ServiceSpec(
                type='ClusterIP',
                selector=labels,
                ports=[k8s.ServicePort(
                    port=config.port,
                    target_port=k8s.IntOrString.from_number(config.port)
                )]
            )
        )

    def _scale_cpu(self, cpu: str) -> str:
        """Double CPU for limits"""
        value = int(cpu.rstrip('m'))
        return f"{value * 2}m"

    def _scale_memory(self, memory: str) -> str:
        """Double memory for limits"""
        value = int(memory.rstrip('Mi'))
        return f"{value * 2}Mi"
```

Use the component:

```python
from constructs import Construct
from cdk8s import App, Chart
from components.microservice import Microservice, MicroserviceConfig

class MyApp(Chart):
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id)

        # Create API service
        api = Microservice(
            self, 'api',
            MicroserviceConfig(
                namespace='production',
                image='myapp/api:v1.2.3',
                replicas=3,
                port=8080,
                cpu_request='200m',
                memory_request='256Mi',
                env={
                    'DATABASE_URL': 'postgres://db:5432/app',
                    'CACHE_ENABLED': 'true'
                }
            )
        )

        # Create worker service
        worker = Microservice(
            self, 'worker',
            MicroserviceConfig(
                namespace='production',
                image='myapp/worker:v1.2.3',
                replicas=2,
                port=8081,
                env={
                    'QUEUE_URL': f'http://api.production.svc.cluster.local:8080'
                }
            )
        )

app = App()
MyApp(app, "myapp")
app.synth()
```

## Using Loops for Bulk Resource Creation

Generate multiple resources with loops:

```python
from constructs import Construct
from cdk8s import App, Chart
from components.microservice import Microservice, MicroserviceConfig

class MultiServiceApp(Chart):
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id)

        # Define services configuration
        services = [
            {
                'name': 'api',
                'image': 'myapp/api:latest',
                'replicas': 3,
                'port': 8080
            },
            {
                'name': 'auth',
                'image': 'myapp/auth:latest',
                'replicas': 2,
                'port': 8081
            },
            {
                'name': 'notifications',
                'image': 'myapp/notifications:latest',
                'replicas': 2,
                'port': 8082
            },
            {
                'name': 'analytics',
                'image': 'myapp/analytics:latest',
                'replicas': 1,
                'port': 8083
            }
        ]

        # Create all services
        for svc in services:
            Microservice(
                self, svc['name'],
                MicroserviceConfig(
                    namespace='production',
                    image=svc['image'],
                    replicas=svc['replicas'],
                    port=svc['port'],
                    env={'SERVICE_NAME': svc['name']}
                )
            )

app = App()
MultiServiceApp(app, "multi-service")
app.synth()
```

This generates four complete microservices with deployments and services in a few lines of code.

## Implementing Environment-Specific Configuration

Generate different manifests for each environment:

```python
from constructs import Construct
from cdk8s import App, Chart
from imports import k8s
from typing import Dict
import os

class EnvironmentConfig:
    def __init__(self, env: str):
        self.env = env
        self.configs = {
            'development': {
                'replicas': 1,
                'resources': {
                    'cpu': '100m',
                    'memory': '128Mi'
                },
                'image_tag': 'latest'
            },
            'staging': {
                'replicas': 2,
                'resources': {
                    'cpu': '200m',
                    'memory': '256Mi'
                },
                'image_tag': 'staging'
            },
            'production': {
                'replicas': 5,
                'resources': {
                    'cpu': '500m',
                    'memory': '512Mi'
                },
                'image_tag': 'v1.2.3'
            }
        }

    def get(self, key: str):
        return self.configs[self.env][key]

class EnvironmentApp(Chart):
    def __init__(self, scope: Construct, id: str, environment: str):
        super().__init__(scope, id)

        config = EnvironmentConfig(environment)

        k8s.KubeDeployment(
            self, 'deployment',
            metadata=k8s.ObjectMeta(
                namespace=environment,
                name='app',
                labels={
                    'app': 'myapp',
                    'environment': environment
                }
            ),
            spec=k8s.DeploymentSpec(
                replicas=config.get('replicas'),
                selector=k8s.LabelSelector(
                    match_labels={'app': 'myapp'}
                ),
                template=k8s.PodTemplateSpec(
                    metadata=k8s.ObjectMeta(
                        labels={'app': 'myapp'}
                    ),
                    spec=k8s.PodSpec(
                        containers=[
                            k8s.Container(
                                name='app',
                                image=f"myapp:{config.get('image_tag')}",
                                resources=k8s.ResourceRequirements(
                                    requests={
                                        'cpu': k8s.Quantity.from_string(
                                            config.get('resources')['cpu']
                                        ),
                                        'memory': k8s.Quantity.from_string(
                                            config.get('resources')['memory']
                                        )
                                    }
                                )
                            )
                        ]
                    )
                )
            )
        )

# Generate for all environments
app = App()
for env in ['development', 'staging', 'production']:
    EnvironmentApp(app, f"app-{env}", env)
app.synth()
```

Run synthesis to generate manifests for all environments:

```bash
cdk8s synth
# Creates: dist/app-development.k8s.yaml
#          dist/app-staging.k8s.yaml
#          dist/app-production.k8s.yaml
```

## Building Complex Resources with Conditionals

Add conditional logic:

```python
from constructs import Construct
from cdk8s import App, Chart
from imports import k8s

class DatabaseApp(Chart):
    def __init__(
        self,
        scope: Construct,
        id: str,
        enable_replica: bool = False,
        enable_monitoring: bool = False
    ):
        super().__init__(scope, id)

        labels = {'app': 'database'}

        # Primary database
        k8s.KubeStatefulSet(
            self, 'primary',
            metadata=k8s.ObjectMeta(
                name='postgres-primary',
                labels=labels
            ),
            spec=k8s.StatefulSetSpec(
                service_name='postgres',
                replicas=1,
                selector=k8s.LabelSelector(match_labels=labels),
                template=k8s.PodTemplateSpec(
                    metadata=k8s.ObjectMeta(labels=labels),
                    spec=k8s.PodSpec(
                        containers=[
                            k8s.Container(
                                name='postgres',
                                image='postgres:15',
                                ports=[k8s.ContainerPort(container_port=5432)],
                                volume_mounts=[
                                    k8s.VolumeMount(
                                        name='data',
                                        mount_path='/var/lib/postgresql/data'
                                    )
                                ]
                            )
                        ]
                    )
                ),
                volume_claim_templates=[
                    k8s.KubePersistentVolumeClaim(
                        self, 'pvc',
                        metadata=k8s.ObjectMeta(name='data'),
                        spec=k8s.PersistentVolumeClaimSpec(
                            access_modes=['ReadWriteOnce'],
                            resources=k8s.ResourceRequirements(
                                requests={'storage': k8s.Quantity.from_string('10Gi')}
                            )
                        )
                    )
                ]
            )
        )

        # Optional read replica
        if enable_replica:
            k8s.KubeStatefulSet(
                self, 'replica',
                metadata=k8s.ObjectMeta(
                    name='postgres-replica',
                    labels={**labels, 'role': 'replica'}
                ),
                spec=k8s.StatefulSetSpec(
                    service_name='postgres-replica',
                    replicas=1,
                    selector=k8s.LabelSelector(
                        match_labels={**labels, 'role': 'replica'}
                    ),
                    template=k8s.PodTemplateSpec(
                        metadata=k8s.ObjectMeta(
                            labels={**labels, 'role': 'replica'}
                        ),
                        spec=k8s.PodSpec(
                            containers=[
                                k8s.Container(
                                    name='postgres',
                                    image='postgres:15',
                                    env=[
                                        k8s.EnvVar(
                                            name='REPLICA_MODE',
                                            value='true'
                                        )
                                    ]
                                )
                            ]
                        )
                    ),
                    volume_claim_templates=[
                        k8s.KubePersistentVolumeClaim(
                            self, 'replica-pvc',
                            metadata=k8s.ObjectMeta(name='data'),
                            spec=k8s.PersistentVolumeClaimSpec(
                                access_modes=['ReadWriteOnce'],
                                resources=k8s.ResourceRequirements(
                                    requests={'storage': k8s.Quantity.from_string('10Gi')}
                                )
                            )
                        )
                    ]
                )
            )

        # Optional monitoring
        if enable_monitoring:
            k8s.KubeServiceMonitor(
                self, 'monitor',
                metadata=k8s.ObjectMeta(
                    name='postgres-monitor',
                    labels=labels
                ),
                spec={
                    'selector': {
                        'matchLabels': labels
                    },
                    'endpoints': [{
                        'port': 'metrics',
                        'interval': '30s'
                    }]
                }
            )

app = App()
DatabaseApp(app, "database", enable_replica=True, enable_monitoring=True)
app.synth()
```

## Generating ConfigMaps from Files

Load configuration from external files:

```python
from constructs import Construct
from cdk8s import App, Chart
from imports import k8s
import json

class ConfigApp(Chart):
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id)

        # Load config from JSON file
        with open('config/app-config.json', 'r') as f:
            app_config = json.load(f)

        # Create ConfigMap from loaded data
        k8s.KubeConfigMap(
            self, 'config',
            metadata=k8s.ObjectMeta(
                name='app-config',
                namespace='production'
            ),
            data={
                'config.json': json.dumps(app_config, indent=2)
            }
        )

        # Create ConfigMap from multiple files
        config_files = ['nginx.conf', 'app.properties', 'logging.yaml']
        file_data = {}

        for filename in config_files:
            with open(f'config/{filename}', 'r') as f:
                file_data[filename] = f.read()

        k8s.KubeConfigMap(
            self, 'files',
            metadata=k8s.ObjectMeta(
                name='config-files',
                namespace='production'
            ),
            data=file_data
        )

app = App()
ConfigApp(app, "config")
app.synth()
```

## Validating Resources Before Synthesis

Add validation logic:

```python
from constructs import Construct
from cdk8s import App, Chart
from imports import k8s

class ValidatedApp(Chart):
    def __init__(self, scope: Construct, id: str, replicas: int):
        super().__init__(scope, id)

        # Validate replicas
        if replicas < 1:
            raise ValueError("Replicas must be at least 1")
        if replicas > 10:
            raise ValueError("Replicas cannot exceed 10")

        # Validate odd number for quorum
        if replicas % 2 == 0:
            print(f"Warning: Even replica count {replicas} may affect quorum")

        k8s.KubeDeployment(
            self, 'deployment',
            metadata=k8s.ObjectMeta(name='app'),
            spec=k8s.DeploymentSpec(
                replicas=replicas,
                selector=k8s.LabelSelector(
                    match_labels={'app': 'myapp'}
                ),
                template=k8s.PodTemplateSpec(
                    metadata=k8s.ObjectMeta(
                        labels={'app': 'myapp'}
                    ),
                    spec=k8s.PodSpec(
                        containers=[
                            k8s.Container(
                                name='app',
                                image='myapp:latest'
                            )
                        ]
                    )
                )
            )
        )

app = App()
ValidatedApp(app, "validated", replicas=3)
app.synth()
```

## Summary

CDK8s with Python transforms Kubernetes manifest management. You write real Python code with loops, conditionals, and functions instead of copying YAML. Type checking catches errors early, and reusable components reduce duplication. The synthesized YAML works with any Kubernetes cluster, so you get the benefits of programming without vendor lock-in. For teams comfortable with Python, CDK8s provides a powerful way to manage complex Kubernetes deployments.

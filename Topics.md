# DevOps, SRE, and Observability Topics

This is a broad catalogue of subjects that can be developed into tutorials, explainers, comparisons, opinion pieces, reference guides, and real-world case studies. Topics range from foundational concepts to specific tools and advanced operating practices.

## DevOps Foundations

- What DevOps is and what it is not
- DevOps principles, culture, and the CALMS framework
- The software delivery lifecycle
- Development, staging, and production environments
- Continuous integration, delivery, and deployment
- Infrastructure as Code
- Configuration as Code
- Policy as Code
- Documentation as Code
- Everything as Code
- Immutable infrastructure
- Declarative versus imperative operations
- Pets versus cattle infrastructure
- Shift-left and shift-right practices
- The twelve-factor app methodology
- DORA metrics and software delivery performance
- Value-stream mapping for software delivery
- DevOps maturity models
- DevOps anti-patterns
- Measuring the return on DevOps investment
- Building a DevOps roadmap
- DevOps for startups, enterprises, and regulated organizations
- DevOps versus SRE versus platform engineering
- NoOps, AIOps, and autonomous operations

## Linux and Operating Systems

- Linux fundamentals for DevOps engineers
- Linux filesystem hierarchy
- Users, groups, permissions, ACLs, and capabilities
- Processes, signals, jobs, and process supervision
- systemd services, timers, targets, and journald
- Linux namespaces and control groups
- Kernel parameters and sysctl tuning
- Linux networking and network namespaces
- Package management with apt, dnf, yum, apk, and Nix
- Shell scripting with Bash and Zsh
- Text processing with grep, sed, awk, jq, and yq
- SSH configuration, hardening, tunnelling, and bastion hosts
- Cron jobs and scheduled workloads
- Log rotation and retention
- Disk, memory, CPU, and I/O troubleshooting
- Filesystems: ext4, XFS, Btrfs, and ZFS
- Linux boot process and recovery
- Kernel upgrades and live patching
- OS image creation and golden images
- Ubuntu, Debian, Red Hat Enterprise Linux, Rocky Linux, AlmaLinux, and Alpine Linux
- NixOS and reproducible operating systems
- Windows Server administration for DevOps
- PowerShell automation
- Windows Subsystem for Linux
- macOS as a DevOps workstation

## Networking and Connectivity

- TCP/IP and the OSI model for practitioners
- IPv4, IPv6, CIDR, and subnetting
- DNS architecture, record types, caching, and troubleshooting
- DHCP, NAT, PAT, and connection tracking
- TCP versus UDP and QUIC
- HTTP/1.1, HTTP/2, and HTTP/3
- TLS, certificates, certificate authorities, and mTLS
- Routing, switching, VLANs, and network segmentation
- BGP, OSPF, ECMP, and anycast
- Software-defined networking
- Virtual private clouds, subnets, route tables, and gateways
- VPNs with WireGuard, OpenVPN, and IPsec
- Zero-trust networking
- Firewalls with nftables, iptables, UFW, and pf
- Proxies, reverse proxies, and forward proxies
- Load-balancing algorithms and architectures
- Layer 4 versus Layer 7 load balancing
- HAProxy, NGINX, Envoy, Traefik, and Caddy
- Content delivery networks and edge caching
- Network performance, latency, jitter, packet loss, and bandwidth
- Network debugging with ping, traceroute, dig, curl, tcpdump, and Wireshark
- Network automation and infrastructure testing
- IP address management
- Service discovery
- Ingress and egress management

## Servers, Bare Metal, and Data Centres

- Bare-metal server provisioning
- PXE and iPXE network booting
- BIOS, UEFI, Secure Boot, BMC, IPMI, iDRAC, and iLO
- RAID levels, HBAs, and storage controllers
- CPU, NUMA, memory, disk, and NIC selection
- Rack design, cabling, power, cooling, and redundancy
- Colocation versus public cloud
- Data-centre tiers and fault domains
- Hardware lifecycle management
- Firmware and BIOS update automation
- Metal-as-a-Service with Canonical MAAS
- Bare Metal Operator and Tinkerbell
- Equinix Metal and hosted bare metal
- Hardware monitoring and out-of-band management
- Building highly available bare-metal infrastructure
- Migrating from cloud to bare metal

## Virtualization and Hypervisors

- Virtual machines versus containers
- Type 1 versus Type 2 hypervisors
- Proxmox Virtual Environment
- Proxmox clusters, quorum, storage, backups, and high availability
- KVM and QEMU
- libvirt, virsh, and virt-manager
- VMware ESXi and vSphere
- Microsoft Hyper-V
- Xen and XCP-ng
- OpenStack compute, networking, and storage
- Apache CloudStack
- Harvester hyperconverged infrastructure
- LXC and LXD system containers
- Vagrant development environments
- Packer machine image automation
- VM templates, cloning, snapshots, and live migration
- GPU and PCI passthrough
- Virtual networking and virtual storage
- Hyperconverged infrastructure
- Capacity planning for virtualized clusters

## Containers and Container Runtimes

- Container fundamentals and the Open Container Initiative
- Docker architecture and core concepts
- Writing efficient, secure Dockerfiles
- Multi-stage Docker builds
- Docker Compose for local and production workloads
- Docker networking, volumes, and storage drivers
- Docker BuildKit, buildx, and Build Cloud
- Rootless Docker
- Docker security and runtime isolation
- Podman, Buildah, and Skopeo
- containerd and CRI-O
- runc, crun, Kata Containers, and gVisor
- Linux namespaces, cgroups, capabilities, and seccomp
- Container image layers and copy-on-write filesystems
- Container registries and registry mirrors
- Harbor, Docker Hub, GitHub Container Registry, and cloud registries
- Image tagging, versioning, promotion, and retention
- Multi-architecture container images
- Distroless, scratch, and minimal base images
- Container image vulnerability scanning
- Software bills of materials for container images
- Container signing and verification with Sigstore and Cosign
- Debugging containers in production
- Container resource limits and quality of service
- FinOps for container workloads

## Kubernetes Fundamentals

- Kubernetes architecture and control-plane components
- Pods, ReplicaSets, Deployments, and StatefulSets
- DaemonSets, Jobs, and CronJobs
- Services, EndpointSlices, and service discovery
- ConfigMaps and Secrets
- Namespaces, labels, annotations, and selectors
- Requests, limits, quotas, and LimitRanges
- Liveness, readiness, and startup probes
- Scheduling, affinity, anti-affinity, taints, and tolerations
- Init containers, sidecars, and ephemeral containers
- PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- Ingress, Gateway API, and load balancing
- Role-based access control and service accounts
- Admission controllers and webhooks
- Custom Resource Definitions and operators
- Finalizers, owner references, and garbage collection
- Kubernetes API conventions and server-side apply
- kubectl, Kustomize, Helm, and Jsonnet
- Kubernetes troubleshooting and debugging
- Kubernetes upgrades and version skew
- Kubernetes backup and disaster recovery
- Kubernetes multi-tenancy
- Kubernetes high availability
- Kubernetes performance and scalability
- Kubernetes cost optimization
- Kubernetes security hardening
- Kubernetes audit logging

## Kubernetes Distributions and Cluster Management

- kubeadm cluster bootstrapping
- Managed Kubernetes: EKS, GKE, and AKS
- OpenShift and OKD
- Rancher and Rancher Kubernetes Engine
- K3s, MicroK8s, and lightweight Kubernetes
- Talos Linux for Kubernetes
- Flatcar Container Linux and Fedora CoreOS
- Cluster API and declarative cluster lifecycle management
- Kubespray and Ansible-based provisioning
- kind, minikube, k3d, and local clusters
- Virtual clusters with vCluster
- Multi-cluster Kubernetes management
- Fleet, Anthos, Azure Arc, and Google Distributed Cloud
- Air-gapped and disconnected Kubernetes
- Edge Kubernetes
- Kubernetes on bare metal
- Cluster autoscaling with Cluster Autoscaler and Karpenter
- Node lifecycle management
- Kubernetes conformance and interoperability

## Kubernetes Networking, Storage, and Ecosystem

- Container Network Interface fundamentals
- Cilium and eBPF networking
- Calico, Flannel, Weave Net, and Antrea
- MetalLB and bare-metal load balancing
- CoreDNS configuration and troubleshooting
- NetworkPolicy design and enforcement
- Kubernetes dual-stack IPv4/IPv6
- Multus and multiple network interfaces
- Container Storage Interface fundamentals
- Ceph and Rook
- Longhorn, OpenEBS, Portworx, and LINSTOR
- Local Persistent Volumes and local-path provisioning
- Cloud-native storage and data locality
- Velero and Kubernetes backup
- cert-manager and automated certificate management
- ExternalDNS and DNS automation
- External Secrets Operator and Secrets Store CSI Driver
- Descheduler and advanced scheduling
- KEDA and event-driven autoscaling
- Vertical Pod Autoscaler
- Knative and serverless Kubernetes
- Crossplane and control planes
- Backstage Kubernetes integration
- Operator SDK and Kubebuilder

## Cloud Platforms and Architecture

- Public, private, hybrid, sovereign, and multi-cloud strategies
- Amazon Web Services
- Microsoft Azure
- Google Cloud Platform
- Oracle Cloud Infrastructure
- IBM Cloud, DigitalOcean, Akamai Cloud, and Hetzner Cloud
- Cloud account, project, folder, and subscription structure
- Landing zones and cloud foundations
- Shared-responsibility models
- Cloud networking and private connectivity
- Compute instances and autoscaling
- Managed databases and data services
- Object, block, and file storage
- Serverless functions and event-driven services
- Cloud load balancers and API gateways
- Cloud identity and access management
- Cloud logging, monitoring, and audit services
- Availability zones, regions, and fault domains
- Designing for cloud portability
- Multi-cloud networking and identity
- Cloud migrations and modernization
- Cloud repatriation
- Private cloud with OpenStack, CloudStack, and VMware
- Well-Architected Framework reviews
- Cloud service quotas and limits
- Local cloud emulation with LocalStack

## Infrastructure as Code

- Terraform fundamentals and workflow
- Terraform modules and reusable infrastructure
- Terraform state, locking, backends, and recovery
- Terraform testing, validation, and policy enforcement
- Terraform imports, moved blocks, and refactoring
- Terraform workspaces and environment strategies
- Terraform at scale
- OpenTofu
- Pulumi and infrastructure in general-purpose languages
- AWS CloudFormation and AWS CDK
- Azure Bicep and ARM templates
- Google Cloud Infrastructure Manager
- Crossplane compositions
- Ansible provisioning
- Salt, Chef, and Puppet
- Cloud-init and first-boot configuration
- Terragrunt and orchestration patterns
- Atlantis and pull-request automation
- Spacelift, env0, Scalr, and HCP Terraform
- Drift detection and remediation
- Secrets management in Infrastructure as Code
- IaC security scanning with Checkov, tfsec, Trivy, and Terrascan
- Cost estimation with Infracost
- Testing infrastructure with Terratest
- Ephemeral infrastructure environments

## Configuration Management and Automation

- Ansible inventories, playbooks, roles, and collections
- Idempotent automation
- Agentless versus agent-based configuration management
- Dynamic inventory and service discovery
- Configuration drift and reconciliation
- Secrets and variables in automation
- Rolling updates with configuration-management tools
- Automating patch management
- Automation testing with Molecule
- Runbook automation
- Event-driven Ansible
- Rundeck, StackStorm, and AWX
- Python for systems automation
- Go for infrastructure tooling
- Task runners: Make, Just, Task, and npm scripts
- Remote execution and orchestration
- Self-healing automation

## Source Control and Collaboration

- Git fundamentals for operations teams
- Branching strategies: trunk-based, GitHub Flow, and GitFlow
- Conventional Commits and semantic versioning
- Pull-request workflows and code review
- Monorepos versus polyrepos
- Git hooks and pre-commit frameworks
- Git large file storage
- Signed commits and tags
- Repository protection rules
- CODEOWNERS and ownership models
- Automated dependency management with Renovate and Dependabot
- Release notes and changelog automation
- GitHub, GitLab, Bitbucket, and Gitea
- InnerSource practices
- Managing infrastructure code in Git

## Continuous Integration

- Designing fast, reliable CI pipelines
- GitHub Actions
- GitLab CI/CD
- Jenkins and Jenkins Configuration as Code
- CircleCI, Buildkite, Travis CI, and Drone
- Azure Pipelines and Google Cloud Build
- Tekton and cloud-native pipelines
- Dagger and portable pipelines
- Self-hosted versus managed CI runners
- Pipeline as Code
- Matrix builds and parallel execution
- Build caching and incremental builds
- Reproducible and hermetic builds
- Test pyramids and test automation
- Unit, integration, contract, end-to-end, and smoke testing
- Static analysis, linting, and formatting
- CI secrets and workload identity federation
- Securing CI runners and build environments
- Ephemeral CI runners
- CI observability and pipeline analytics
- Flaky test detection and remediation
- Artifact management and provenance
- CI cost optimization

## Continuous Delivery and Release Engineering

- Continuous delivery versus continuous deployment
- Deployment pipelines and environment promotion
- Rolling, blue-green, canary, and recreate deployments
- Feature flags and progressive delivery
- A/B testing and experimentation platforms
- Release orchestration
- Argo Rollouts and Flagger
- Spinnaker, Harness, and Octopus Deploy
- Artifact repositories with Artifactory, Nexus, and cloud registries
- Package management and release automation
- Semantic Release and automated versioning
- Database migration strategies
- Expand-and-contract schema changes
- Zero-downtime deployments
- Deployment verification and automated rollback
- Release trains, release freezes, and change windows
- Mobile and desktop release engineering
- Managing backward and forward compatibility
- Environment parity and promotion
- Ephemeral preview environments
- Release engineering metrics

## GitOps

- GitOps principles and reconciliation
- Argo CD
- Flux CD
- Fleet and multi-cluster GitOps
- ApplicationSets and deployment generators
- Repository structures for GitOps
- Helm versus Kustomize in GitOps
- Secrets management with SOPS and Sealed Secrets
- Image automation and promotion
- Progressive delivery with GitOps
- GitOps for infrastructure beyond Kubernetes
- GitOps drift detection and self-healing
- GitOps security and access control
- GitOps at enterprise scale
- Disaster recovery for GitOps control planes

## Site Reliability Engineering

- SRE principles and the SRE operating model
- Service-level indicators, objectives, and agreements
- Choosing meaningful SLIs
- Availability, latency, throughput, quality, and correctness SLIs
- User-journey and window-based SLIs
- Error budgets and error-budget policies
- Multi-window, multi-burn-rate alerting
- Reliability targets and the cost of reliability
- Toil: identification, measurement, and reduction
- Engineering versus operational work
- Production readiness reviews
- Operational readiness checklists
- Service ownership models
- Reliability reviews and reliability roadmaps
- Risk analysis and risk registers
- Reliability testing and validation
- Capacity planning and demand forecasting
- Load shedding and graceful degradation
- Redundancy, failover, and fault isolation
- Repair automation and self-healing systems
- Reliability in monoliths and microservices
- SRE for stateful systems
- SRE for internal platforms
- SRE for machine-learning systems
- Implementing SRE in small and large organizations
- SRE team topologies: embedded, consulting, and platform
- SRE anti-patterns and common failure modes

## Observability Foundations

- Monitoring versus observability
- The three pillars: metrics, logs, and traces
- Events, profiles, and continuous profiling
- White-box versus black-box monitoring
- The four golden signals
- RED, USE, and resource-saturation methods
- Observability-driven development
- Observability maturity models
- Designing an observability strategy
- Instrumentation standards and governance
- Observability for distributed systems
- Observability pipelines and telemetry routing
- Telemetry schemas, semantic conventions, and data contracts
- High-cardinality and high-dimensional telemetry
- Sampling, aggregation, and filtering
- Telemetry enrichment and correlation
- Context propagation
- Observability data quality
- Multi-tenant observability
- Observability as Code
- Observability costs and FinOps
- Build versus buy for observability platforms
- Open-source versus commercial observability

## Metrics and Monitoring

- Metric types: counters, gauges, histograms, and summaries
- Prometheus architecture and data model
- PromQL fundamentals and advanced queries
- Prometheus service discovery and relabelling
- Recording rules and alerting rules
- Prometheus federation and remote write
- Prometheus scaling with Thanos, Cortex, and Mimir
- VictoriaMetrics
- InfluxDB and time-series databases
- Graphite and StatsD
- OpenTelemetry metrics
- Grafana dashboards and dashboard design
- Grafana Mimir and managed metrics
- Node Exporter, cAdvisor, kube-state-metrics, and exporters
- Blackbox Exporter and probe monitoring
- Pushgateway and short-lived jobs
- Nagios, Icinga, Zabbix, and Sensu
- CloudWatch, Azure Monitor, and Google Cloud Monitoring
- Datadog, New Relic, Dynatrace, Splunk Observability, and OneUptime
- Infrastructure, application, database, and network monitoring
- Kubernetes monitoring
- Serverless monitoring
- Business and product metrics
- Dashboard anti-patterns
- Metric cardinality management
- Long-term metrics retention
- Monitoring-as-Code

## Logging

- Structured versus unstructured logging
- Application log design and log levels
- Correlation IDs and request IDs
- Centralized log aggregation
- The Elastic Stack: Elasticsearch, Logstash, and Kibana
- OpenSearch and OpenSearch Dashboards
- Grafana Loki and LogQL
- Fluent Bit, Fluentd, Vector, and Logstash pipelines
- OpenTelemetry logs
- Syslog and journald collection
- Kubernetes container logging
- Cloud-native logging services
- Log parsing, normalization, and enrichment
- Log sampling, filtering, and deduplication
- Log indexing and search strategies
- Log retention, tiering, and archival
- Personally identifiable information and sensitive-data redaction
- Tamper-resistant audit logging
- Log-based metrics and alerts
- Logging performance and cost optimization
- Debugging with logs
- Logging anti-patterns

## Distributed Tracing and OpenTelemetry

- Distributed tracing fundamentals
- Traces, spans, links, events, and baggage
- Trace and span context propagation
- W3C Trace Context and Baggage standards
- OpenTelemetry architecture
- OpenTelemetry SDKs and APIs
- Automatic versus manual instrumentation
- OpenTelemetry Collector deployment patterns
- Collector receivers, processors, exporters, and connectors
- OpenTelemetry Transformation Language
- OpenTelemetry semantic conventions
- OpenTelemetry Operator for Kubernetes
- OpenTelemetry Protocol over gRPC and HTTP
- Tail-based, head-based, probabilistic, and adaptive sampling
- Trace sampling at scale
- Trace-to-log and trace-to-metric correlation
- Jaeger, Zipkin, Grafana Tempo, and OpenSearch tracing
- Distributed tracing with OneUptime
- Tracing asynchronous and event-driven systems
- Tracing databases, queues, and external APIs
- Tracing serverless applications
- Tracing service meshes
- Span naming and attribute design
- Debugging broken context propagation
- Migrating from vendor agents to OpenTelemetry
- OpenTelemetry Collector performance and scaling
- OpenTelemetry security and multi-tenancy

## Application Performance and Digital Experience

- Application Performance Monitoring
- Real User Monitoring
- Synthetic monitoring
- Browser and mobile observability
- Core Web Vitals
- API monitoring
- Uptime and availability monitoring
- SSL/TLS certificate monitoring
- DNS monitoring
- Cron job and heartbeat monitoring
- Database performance monitoring
- Network performance monitoring
- Code-level profiling
- Continuous profiling with Parca, Pyroscope, and eBPF
- Error tracking with Sentry and similar platforms
- Frontend error and session-replay monitoring
- Dependency and service maps
- Root-cause analysis
- Correlating deploys with performance regressions
- Performance budgets
- Observability for GraphQL, gRPC, and WebSockets
- Observability for mobile and desktop apps

## Alerting, On-Call, and Incident Management

- Actionable alert design
- Symptoms versus causes in alerting
- Static, dynamic, anomaly, and SLO-based alerts
- Alert thresholds and hysteresis
- Alert routing, grouping, inhibition, and deduplication
- Alertmanager configuration and high availability
- PagerDuty, Opsgenie, Splunk On-Call, and OneUptime
- On-call rotations and follow-the-sun support
- Sustainable on-call practices
- Alert fatigue and noisy-alert reduction
- Escalation policies
- Incident severity and priority models
- Incident command systems and responder roles
- Incident communication and stakeholder updates
- Incident timelines and evidence collection
- Status pages and subscriber communication
- Public versus private status pages
- Runbooks and operational playbooks
- ChatOps and incident bots
- War rooms and virtual incident response
- Major-incident management
- Security incident response
- Post-incident reviews and blameless postmortems
- Corrective and preventive actions
- Learning from near misses
- Incident-management metrics: MTTD, MTTA, MTTR, and recurrence
- Automating incident response
- AI-assisted incident investigation

## Performance, Scalability, and Capacity

- Performance engineering fundamentals
- Latency, throughput, concurrency, and saturation
- Benchmark design and common benchmarking mistakes
- Load, stress, spike, endurance, and scalability testing
- k6, JMeter, Gatling, Locust, and Vegeta
- Distributed load testing
- Capacity models and forecasting
- Horizontal and vertical scaling
- Autoscaling strategies and predictive scaling
- Queueing theory for software systems
- The Universal Scalability Law
- Performance profiling and flame graphs
- CPU, memory, disk, and network bottlenecks
- Memory leaks and garbage-collection tuning
- Caching strategies and cache invalidation
- Content delivery and edge caching
- Database query and index optimization
- Connection pools and resource pools
- Rate limiting, throttling, quotas, and backpressure
- Load shedding and admission control
- Performance regression testing in CI
- Scalability testing for Kubernetes
- Cost-performance optimization

## Distributed Systems and Resilience

- Distributed-systems fundamentals
- CAP theorem and PACELC
- Consistency models and eventual consistency
- Consensus algorithms: Raft, Paxos, and Zab
- Leader election and distributed locking
- Logical clocks, vector clocks, and ordering
- Idempotency and deduplication
- Retries, timeouts, exponential backoff, and jitter
- Circuit breakers and bulkheads
- Deadlines and cancellation propagation
- Health checks and failure detection
- Split-brain scenarios and quorum
- Data replication and conflict resolution
- Stateless versus stateful architecture
- Event-driven architecture
- Event sourcing and CQRS
- Saga patterns and distributed transactions
- Transactional outbox and change-data capture
- Message delivery semantics
- Resilient API design
- Graceful shutdown and connection draining
- Brownouts and graceful degradation
- Dependency isolation and cell-based architecture
- Chaos engineering and fault injection
- Jepsen-style distributed-systems testing

## Service Mesh, APIs, and Traffic Management

- Service-mesh architecture and trade-offs
- Istio and Envoy
- Linkerd
- Consul service mesh
- Cilium service mesh
- Sidecar versus sidecarless service meshes
- mTLS and workload identity
- Traffic splitting, mirroring, and fault injection
- Service-mesh observability
- Service-mesh performance and cost
- API gateway patterns
- Kong, Tyk, Ambassador/Emissary, and Apache APISIX
- REST, GraphQL, gRPC, and asynchronous APIs
- API versioning and lifecycle management
- API authentication and authorization
- API rate limiting and quotas
- OpenAPI and API contracts
- Consumer-driven contract testing
- Service discovery and registry patterns
- North-south versus east-west traffic

## Storage, Databases, and Data Reliability

- Block, file, and object storage
- Local, network-attached, and software-defined storage
- Ceph architecture: RADOS, RBD, CephFS, and RGW
- ZFS administration, snapshots, and replication
- NFS, SMB, and distributed filesystems
- GlusterFS, MinIO, and SeaweedFS
- Storage performance, IOPS, throughput, and latency
- Storage capacity and lifecycle management
- Data durability, availability, and consistency
- PostgreSQL operations and high availability
- MySQL and MariaDB operations and replication
- MongoDB operations and replica sets
- Redis operations, persistence, Sentinel, and Cluster
- Cassandra, ScyllaDB, and distributed databases
- Elasticsearch and OpenSearch operations
- Database connection pooling with PgBouncer and ProxySQL
- Database schema migrations and rollback strategies
- Database backup, restore, and point-in-time recovery
- Database observability
- Database reliability engineering
- Managed versus self-hosted databases
- Data pipelines and data observability
- Data quality, lineage, and freshness
- Change-data capture with Debezium
- Schema registries and data contracts

## Messaging and Streaming

- Message queues versus event streams
- Apache Kafka architecture and operations
- Kafka partitions, replication, consumer groups, and rebalancing
- Kafka Connect, Kafka Streams, and MirrorMaker
- Apache Pulsar
- RabbitMQ exchanges, queues, and clustering
- NATS and JetStream
- Redis Streams
- Amazon SQS and SNS
- Google Pub/Sub and Azure Service Bus
- Dead-letter queues and poison messages
- Delivery guarantees and exactly-once semantics
- Ordering, deduplication, and idempotent consumers
- Backpressure and consumer lag
- Schema evolution for events
- Monitoring messaging and streaming systems
- Disaster recovery for event platforms

## Backup, Disaster Recovery, and Business Continuity

- Backup strategies and the 3-2-1 rule
- Full, incremental, and differential backups
- Snapshots versus backups
- Recovery Point Objectives and Recovery Time Objectives
- Business impact analysis
- Disaster-recovery architectures
- Active-active, active-passive, pilot-light, and warm-standby designs
- Cross-region and cross-cloud recovery
- Application-consistent backups
- Database and Kubernetes backup strategies
- Restic, BorgBackup, Kopia, and Velero
- Rclone and object-storage replication
- Immutable and air-gapped backups
- Ransomware-resistant backups
- Backup encryption and key management
- Backup monitoring and failure alerting
- Restore testing and recovery drills
- Disaster-recovery runbooks
- Game days and business-continuity exercises
- Designing for regional and provider failure

## DevSecOps and Infrastructure Security

- DevSecOps principles and security culture
- Threat modelling for infrastructure and applications
- Secure software development lifecycle
- Zero-trust architecture
- Defence in depth
- Least privilege and separation of duties
- Security baselines and hardening guides
- CIS Benchmarks and Kubernetes security standards
- Vulnerability management and patching
- Static, dynamic, interactive, and runtime application security testing
- Software composition analysis
- Container and Kubernetes security
- Runtime detection with Falco and Tetragon
- Host-based intrusion detection
- Web application firewalls
- Distributed denial-of-service protection
- Network segmentation and microsegmentation
- Security information and event management
- Security orchestration, automation, and response
- Cloud security posture management
- Kubernetes security posture management
- Infrastructure as Code security
- Penetration testing and purple-team exercises
- Security monitoring and detection engineering
- Secure remote access and bastion alternatives

## Identity, Secrets, and Cryptography

- Identity and access management fundamentals
- Authentication versus authorization
- Role-, attribute-, and policy-based access control
- Single sign-on and identity federation
- OAuth 2.0, OpenID Connect, and SAML
- Workload identity and machine identities
- SPIFFE and SPIRE
- Privileged access management
- Just-in-time and just-enough access
- HashiCorp Vault
- Cloud key-management and secret-management services
- External Secrets Operator
- SOPS, Sealed Secrets, and encrypted configuration
- Secret rotation and dynamic credentials
- Public key infrastructure and certificate lifecycle management
- TLS, mutual TLS, and certificate pinning
- Hardware security modules
- Encryption at rest, in transit, and in use
- Key rotation, escrow, and recovery
- Preventing secrets in source control
- Secret scanning with Gitleaks and TruffleHog

## Software Supply-Chain Security

- Software supply-chain threat models
- Software bills of materials
- CycloneDX and SPDX
- Artifact signing and verification
- Sigstore, Cosign, Fulcio, and Rekor
- SLSA provenance and maturity levels
- Reproducible builds
- Hermetic build systems
- Dependency pinning and lockfiles
- Dependency confusion and typosquatting
- Trusted package registries and proxies
- Admission policies for trusted images
- in-toto attestations
- Vulnerability Exploitability eXchange
- OpenSSF Scorecard
- Securing CI/CD pipelines
- Ephemeral and isolated build workers
- Supply-chain policy enforcement

## Policy, Governance, and Compliance

- Policy as Code with Open Policy Agent and Rego
- Gatekeeper and Kubernetes admission policy
- Kyverno
- HashiCorp Sentinel
- Cloud governance and guardrails
- Tagging, labelling, and resource naming standards
- Resource ownership and inventory
- Audit trails and evidence automation
- Compliance as Code
- SOC 2, ISO 27001, PCI DSS, HIPAA, and GDPR operations
- Data residency and sovereignty
- Retention and deletion policies
- Change-management controls
- Segregation of duties
- Continuous compliance monitoring
- Exception and waiver management
- Open-source licence compliance
- Governance without blocking delivery

## Platform Engineering and Internal Developer Platforms

- Platform engineering principles
- Platform as a product
- Internal Developer Platforms and portals
- Golden paths and paved roads
- Developer self-service
- Backstage
- Port, Cortex, OpsLevel, and Humanitec
- Crossplane for platform engineering
- Kubernetes operators as platform APIs
- Platform API design
- Service catalogues and ownership metadata
- Software templates and project scaffolding
- Environment provisioning and preview environments
- Developer experience and productivity
- Platform observability
- Platform security and guardrails
- Platform team topologies
- Measuring platform adoption and success
- Avoiding the platform engineering monolith
- Building versus buying a developer platform
- Multi-tenant platform design
- Heroku-style platforms and Cloud Foundry
- Nomad as an application platform

## FinOps and Sustainable Operations

- FinOps principles and operating models
- Cloud cost allocation, tagging, and showback
- Chargeback models
- Unit economics and cost per transaction, tenant, or customer
- Cloud billing and cost anomaly detection
- Rightsizing compute, storage, and databases
- Reserved instances, savings plans, and committed-use discounts
- Spot and preemptible instances
- Kubernetes cost allocation with OpenCost and Kubecost
- Idle-resource detection
- Storage lifecycle and data-transfer cost optimization
- Egress costs and network architecture
- Cost-aware autoscaling and scheduling
- Budget alerts and forecasting
- FinOps for observability telemetry
- Vendor and licence optimization
- Total cost of ownership for cloud versus bare metal
- Green software engineering
- Carbon-aware computing and scheduling
- Energy-efficient infrastructure
- Sustainability metrics for software systems

## Serverless and Event-Driven Operations

- Serverless architecture and operational trade-offs
- AWS Lambda, Azure Functions, and Google Cloud Functions
- Cloudflare Workers and edge functions
- Function packaging and deployment
- Cold starts and latency optimization
- Serverless concurrency and scaling controls
- Serverless networking and private resources
- Event buses and event routing
- Durable execution and workflow engines
- AWS Step Functions, Azure Durable Functions, and Google Workflows
- Temporal and durable workflows
- Serverless observability and tracing
- Serverless security and least privilege
- Local testing for serverless systems
- Serverless cost optimization
- Serverless disaster recovery

## Edge Computing and IoT Operations

- Edge-computing architectures
- Edge versus cloud processing
- Kubernetes at the edge with K3s and MicroK8s
- KubeEdge and Akri
- Fleet management for edge devices
- Over-the-air updates
- Immutable edge-device operating systems
- Intermittent connectivity and offline-first operations
- Edge observability and remote diagnostics
- IoT telemetry with MQTT
- Device identity and certificate management
- Secure boot and hardware roots of trust
- Edge data synchronization
- Content delivery and edge functions
- Raspberry Pi and homelab clusters

## MLOps, LLMOps, and AI Observability

- MLOps principles and machine-learning lifecycles
- Data versioning and experiment tracking
- MLflow, Kubeflow, and Weights & Biases
- Feature stores and model registries
- Training pipelines and GPU orchestration
- Model serving with KServe, Seldon, and BentoML
- Model deployment and canary releases
- Model monitoring and drift detection
- Data drift, concept drift, and model decay
- Model performance, fairness, and explainability
- LLM application architecture and operations
- LLM gateways and model routing
- Prompt versioning and prompt management
- LLM tracing with OpenTelemetry, OpenLLMetry, and OpenLIT
- Token usage, latency, and cost monitoring
- Retrieval-augmented generation observability
- Agent and tool-call observability
- Hallucination, quality, and safety evaluation
- Guardrails and content moderation
- GPU observability and capacity planning
- AI-assisted operations and AIOps
- Anomaly detection for operational telemetry
- Safe use of generative AI in incident response

## Chaos Engineering and Reliability Testing

- Chaos engineering principles
- Building a chaos engineering programme
- Hypothesis-driven experiments
- Blast-radius control and safety mechanisms
- Game days and failure drills
- LitmusChaos, Chaos Mesh, and Gremlin
- Network latency, packet loss, and partition experiments
- CPU, memory, disk, and process-failure experiments
- Pod, node, zone, and region failure testing
- Dependency and third-party outage simulations
- Database and storage failure testing
- DNS and certificate failure testing
- Clock skew and time-related failures
- Chaos testing in CI/CD
- Chaos experiments tied to SLOs
- Disaster-recovery testing
- Resilience scorecards
- Learning from controlled failure

## Developer Environments and Productivity

- Reproducible local-development environments
- Development containers
- Docker Compose development stacks
- Tilt, Skaffold, and Garden
- Telepresence and mirrord
- Local Kubernetes with kind, minikube, and k3d
- Remote development environments
- GitHub Codespaces and Gitpod
- Nix and reproducible developer tooling
- Dotfiles and workstation automation
- Package and tool version managers
- Local cloud emulators
- Seed data and test fixtures
- Developer environment security
- Reducing onboarding time
- Measuring developer experience

## Operations Practices and Team Design

- You build it, you run it
- Centralized versus embedded operations teams
- Team Topologies for DevOps and SRE
- Service ownership and operational accountability
- Onboarding services into production
- Production-access models
- Operational documentation and knowledge management
- Runbook quality and maintenance
- Technical-debt management
- Reliability backlogs and prioritization
- Balancing features, reliability, and security
- Operational reviews and health checks
- Change advisory boards in modern delivery
- Communities of practice and guilds
- Mentoring and career paths in DevOps and SRE
- Hiring and interviewing DevOps and SRE engineers
- Remote and follow-the-sun operations
- Vendor evaluation and management
- Open-source operations and maintainership
- Ethics in monitoring and employee telemetry

## Architecture and Modernization

- Monoliths, modular monoliths, and microservices
- Service-oriented architecture
- Cloud-native architecture
- Domain-driven design for platform teams
- Strangler-fig migrations
- Legacy-system modernization
- Containerizing legacy applications
- Migrating virtual machines to Kubernetes
- Migrating between cloud providers
- Designing multi-region applications
- Active-active application architecture
- Control planes and data planes
- Cell-based and sharded architecture
- Multi-tenant SaaS architecture
- Build versus buy decisions
- Open-source versus managed services
- Architecture decision records
- Evolutionary architecture and fitness functions
- Reliability patterns for third-party dependencies
- Operational simplicity as an architectural goal

## Practical Tutorials and Projects

- Build a Proxmox high-availability homelab
- Create a Kubernetes cluster on Proxmox
- Deploy Kubernetes on bare metal with kubeadm
- Build a lightweight cluster with K3s or MicroK8s
- Configure MetalLB and an ingress controller
- Build a highly available Ceph cluster
- Deploy Rook-Ceph on Kubernetes
- Set up a private container registry with Harbor
- Build and secure a production Docker image
- Deploy an application with Helm and Kustomize
- Implement GitOps with Argo CD or Flux
- Provision a cloud environment with Terraform or OpenTofu
- Build reusable Terraform modules
- Configure servers with Ansible
- Create a complete GitHub Actions or GitLab CI pipeline
- Implement blue-green and canary deployments
- Set up Prometheus, Grafana, and Alertmanager
- Build an OpenTelemetry observability stack
- Collect Kubernetes logs with Fluent Bit and Loki
- Send traces to Jaeger, Tempo, or OneUptime
- Create SLIs, SLOs, and error-budget alerts for a service
- Design an actionable on-call alert policy
- Create an incident-response process and status page
- Run a chaos-engineering game day
- Back up and restore Kubernetes with Velero
- Build a multi-region disaster-recovery exercise
- Harden a Kubernetes cluster against CIS benchmarks
- Sign and verify container images with Cosign
- Generate and enforce an SBOM in CI
- Build a self-service developer portal with Backstage
- Measure and optimize Kubernetes costs
- Monitor an LLM application with OpenTelemetry
- Migrate an application from cloud to bare metal
- Design a zero-downtime database migration
- Diagnose a real production outage from metrics, logs, and traces

## Comparisons and Decision Guides

- Docker versus Podman
- Containers versus virtual machines
- Proxmox versus VMware versus Hyper-V
- Kubernetes versus Nomad versus Docker Swarm
- K3s versus MicroK8s versus kubeadm
- EKS versus GKE versus AKS
- OpenShift versus upstream Kubernetes
- Helm versus Kustomize
- Argo CD versus Flux
- Terraform versus OpenTofu versus Pulumi
- Ansible versus Puppet versus Chef versus Salt
- GitHub Actions versus GitLab CI versus Jenkins
- Prometheus versus VictoriaMetrics versus InfluxDB
- Thanos versus Cortex versus Mimir
- Elasticsearch versus OpenSearch versus Loki
- Jaeger versus Tempo versus Zipkin
- Fluent Bit versus Fluentd versus Vector
- Istio versus Linkerd versus Cilium service mesh
- NGINX versus HAProxy versus Envoy versus Traefik
- Ceph versus Longhorn versus OpenEBS
- Kafka versus Pulsar versus RabbitMQ versus NATS
- Vault versus cloud-native secret managers
- Grafana versus commercial observability platforms
- OpenTelemetry versus vendor-specific instrumentation
- Managed services versus self-hosting
- Public cloud versus private cloud versus bare metal
- Monolith versus microservices
- Blue-green versus canary versus rolling deployments
- SRE versus DevOps versus platform engineering
- Build versus buy for internal developer platforms

## Case Studies and Retrospectives

- Migrating from virtual machines to containers
- Migrating from Docker Compose to Kubernetes
- Moving from a managed Kubernetes service to bare metal
- Moving workloads between cloud providers
- Reducing cloud or Kubernetes costs
- Scaling Prometheus and long-term metrics storage
- Reducing observability telemetry volume and cost
- Replacing proprietary instrumentation with OpenTelemetry
- Recovering from a region-wide outage
- Recovering from data corruption or accidental deletion
- Eliminating a recurring class of incidents
- Reducing alert fatigue and improving on-call health
- Introducing SLOs and error budgets to an organization
- Building a platform engineering team
- Creating an internal developer platform
- Automating a manual release process
- Improving deployment frequency and lead time
- Hardening the software supply chain
- Adopting GitOps across multiple clusters
- Operating Kubernetes at large scale
- Running stateful workloads on Kubernetes
- Designing and testing disaster recovery
- Lessons from failed migrations and rollouts
- Blameless analyses of major production incidents
- Reliability and observability lessons from rapid growth

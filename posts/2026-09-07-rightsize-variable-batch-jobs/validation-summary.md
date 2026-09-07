# Validation Summary: Rightsizing Batch Jobs with Variable Resource Profiles

## Status
validated

## Post Type
Technical guide to batch workload rightsizing and capacity planning, with illustrative JSON, sizing formulas, and a Kubernetes Job manifest.

## Technologies Covered
- Kubernetes Jobs, container resource requests and limits, retries, and scheduling
- AWS Batch compute environments and job resource requirements
- Linux cgroup v2 memory accounting
- Spot and preemptible compute, checkpointing, and retry costs
- Batch partitioning, workload classification, and performance measurement
- JSON and YAML

## Sources Consulted
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes system resource reservations: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes node metrics: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Linux kernel cgroup v2 documentation, including memory.peak: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- AWS Batch compute environments: https://docs.aws.amazon.com/batch/latest/userguide/compute_environments.html
- AWS Batch resource requirements: https://docs.aws.amazon.com/batch/latest/APIReference/API_ResourceRequirement.html
- AWS Batch jobs stuck in RUNNABLE: https://docs.aws.amazon.com/batch/latest/userguide/job_stuck_in_runnable.html
- AWS Batch Spot best practices: https://docs.aws.amazon.com/batch/latest/userguide/bestpractice6.html
- Apache Spark performance tuning, including adaptive skew partition splitting: https://spark.apache.org/docs/latest/sql-performance-tuning.html
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- **Sampling does not guarantee the memory high-water mark.** The original instruction implied that choosing an interval could capture the true peak. Clarified that brief peaks can fall between samples and recommended a kernel-maintained peak where available. Distinguished cgroup memory usage from working-set measurements.
- **Resource-class selection was attributed to the scheduler.** Kubernetes schedules pods using their declared requests; it does not infer an input-dependent resource class. Changed the text to assign class selection and resource specification to submission logic before scheduling.
- **The illustrative Job needed application prerequisites.** Identified the image as a placeholder to replace and explained that the importer must coordinate distinct work items. The completion count does not automatically split input among pods; without application coordination, identical pods can repeat the same import. Preserved the valid manifest.
- **Work stealing was presented as a remedy for a memory-heavy skewed key without qualification.** Clarified that it redistributes independent tasks but cannot reduce an indivisible task's memory requirement. Retained adaptive partitioning as the relevant mitigation.

## Review Notes
- Parsed the JSON record with Python's standard JSON parser and the YAML manifest with PyYAML. Parsed the generated validation.json and checked its status and date. The formulas and size bands are illustrative pseudocode, not executable commands.
- Reviewed the manifest fields against the official Job documentation. batch/v1, parallelism, completions, backoffLimit, restartPolicy: Never, and the container resource fields are valid. No deprecated API appears in the example.
- The Job targets 32 successful pods with requested parallelism of four. Actual concurrency can vary during replacement and termination. backoffLimit is a Job-wide failure budget here, not two retries independently allocated to every completion.
- CPU requests influence scheduling and sharing under contention; omitting a CPU limit allows use of spare CPU when policy permits. Memory requests are not hard usage ceilings. Exceeding a proposed request during historical scoring does not itself imply failure; memory limits and node pressure have different consequences.
- The 6Gi memory request and 8Gi memory limit are consistent. The CPU and memory amounts apply to each importer container. Actual safe values require representative benchmarks; the sample telemetry is illustrative rather than measured evidence.
- Retaining failed attempts, stratifying runs using known input features, measuring per-task skew, and canarying changes are reasonable engineering recommendations. Failed OOM measurements can underestimate unconstrained demand, so preserving them does not make their observed peaks sufficient sizing targets.
- The cost equation assumes allocated resource price is a rate in units compatible with runtime. Shared-node costs require an allocation model, and queue delay belongs in the completion objective or an explicitly valued delay cost. The post does not claim a universal cloud billing formula or guaranteed savings from higher CPU allocations.
- AWS Batch requires compatible compute capacity and supported resource combinations. Unsatisfied requirements can leave jobs RUNNABLE; configured queue time-limit actions may eventually cancel blocked jobs. Spot checkpointing guidance is consistent with AWS recommendations.
- All four official-documentation links and the author link resolve to the intended resources. The importer tag 4.2.1 is an illustrative application version, not a verified public release.
- This was a documentation and local syntax review. No live Kubernetes deployment, importer execution, cloud job, or workload benchmark was performed.

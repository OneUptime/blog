# Validation Summary: How to Use AWS Graviton Processors for HPC Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Graviton processors and Amazon EC2 Graviton instance families
- Amazon EC2 Hpc7g, C7g, C7gn, M7g, and R7g instances
- AWS ParallelCluster with Slurm and Elastic Fabric Adapter (EFA)
- GCC and gfortran ARM optimization flags
- Open MPI with Libfabric/EFA
- GROMACS 2024
- Docker Buildx multi-platform images

## Sources Consulted
- AWS Graviton getting started guide: Building for Graviton - https://github.com/aws/aws-graviton-getting-started
- Amazon EC2 Hpc7g Instances - https://aws.amazon.com/ec2/instance-types/hpc7g/
- Amazon EC2 C7g Instances - https://aws.amazon.com/ec2/instance-types/c7g/
- AWS ParallelCluster Image configuration - https://docs.aws.amazon.com/parallelcluster/latest/ug/Image-v3.html
- AWS ParallelCluster Scheduling configuration - https://docs.aws.amazon.com/parallelcluster/latest/ug/Scheduling-v3.html
- AWS ParallelCluster Elastic Fabric Adapter configuration - https://docs.aws.amazon.com/parallelcluster/latest/ug/efa-v3.html
- AWS ParallelCluster create-cluster CLI reference - https://docs.aws.amazon.com/parallelcluster/latest/ug/pcluster.create-cluster-v3.html
- Amazon EC2 EFA documentation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html
- Amazon EC2 EFA and MPI getting started guide - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-start.html
- Open MPI configure networking options - https://docs.open-mpi.org/en/v5.0.10/installing-open-mpi/configure-cli-options/networking.html
- GROMACS 2024 installation guide - https://manual.gromacs.org/documentation/2024.0/install-guide/index.html
- Docker Buildx build reference - https://docs.docker.com/reference/cli/docker/buildx/build/

## Issues Found

1. **Graviton4 was described as the latest Graviton processor.** As of June 1, 2026, AWS has announced Graviton5-based M9g instances in preview. Changed the wording to avoid calling Graviton4 the latest while preserving the Graviton4 performance claim.

2. **The post stated that Graviton instances typically cost 20-40% less than equivalent Intel or AMD instances.** AWS generally documents this as improved price-performance rather than a universal instance-price discount. Changed the claim to "up to 40% better price-performance."

3. **The C7g comparison incorrectly compared C7g to C6i for the "up to 25%" performance claim.** AWS documents the 25% uplift against Graviton2-based C6g, not Intel C6i. Updated the bullet accordingly and kept the recommendation to benchmark against x86.

4. **The ParallelCluster sample used a placeholder custom AMI.** `ami-0graviton-hpc-ami` is not a valid reusable AMI ID. Removed it and clarified that ParallelCluster selects an ARM-compatible official AMI for ARM instance types.

5. **The ParallelCluster sample described EFA networking but did not enable EFA.** AWS ParallelCluster requires `ComputeResources / Efa / Enabled: true` for Slurm compute resources. Added the `Efa` block to the `hpc7g` compute resource.

6. **The compiler flags used `-mcpu=neoverse-v1` as the recommended Graviton3 target.** AWS recommends `-mcpu=neoverse-512tvb` for Graviton3 and Graviton3E. Updated GCC, gfortran, Open MPI, and GROMACS examples.

7. **The Open MPI build used `--with-efa`, which is not the documented Open MPI configure flag.** Open MPI integrates with EFA through Libfabric, and Open MPI documents `--with-libfabric=DIR`. Changed the example to `--with-libfabric=/opt/amazon/efa` and removed the obsolete C++ MPI bindings flag.

8. **The Open MPI compatibility statement was too broad and used the wrong project spelling.** Updated "OpenMPI" to "Open MPI" and tied EFA support to Open MPI 4.1 and later, matching AWS EFA documentation.

## Review Notes
- The GROMACS build flags and `GMX_SIMD=ARM_NEON_ASIMD` are consistent with GROMACS 2024 documentation for ARM SIMD support.
- The Docker Buildx multi-platform command is syntactically correct, but successful multi-platform builds require a builder/runtime that can execute or cross-build the target platforms.
- The benchmark numbers are presented as a typical comparison, not a universal result. Readers should still benchmark their own workloads and check current EC2 pricing for their AWS Region.

# Validation Summary: How to Containerize a Fortran Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile multi-stage builds
- Docker Compose
- Fortran
- GNU Fortran / gfortran
- BLAS, LAPACK, and OpenBLAS
- MPI / Open MPI
- OpenMP
- Ubuntu 22.04 package-based container images

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker container resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Open MPI mpirun manual: https://docs.open-mpi.org/en/v5.0.7/man-openmpi/man1/mpirun.1.html
- GNU Fortran manual: https://gcc.gnu.org/onlinedocs/gfortran.pdf
- Ubuntu 22.04 package metadata checked with apt-cache for libopenmpi3, libgfortran5, liblapack3, libblas3, and file
- Local Docker CLI help output for docker build, docker run, and docker compose config

## Issues Found
- The main Fortran sample described itself as an HTTP-like server and read a PORT environment variable, but it does not listen on a network port. Changed the wording and code comment to describe it as a numerical program and removed the unused PORT parsing.
- The linear-system solver mutates A and b in place, then the residual check used those mutated values. This did not verify the original Ax = b system. Added A_original and b_original copies and passed those to verify_solution.
- The basic Dockerfile comment mentioned -march=native even though the compile command did not use it, and the article later correctly advises avoiding -march=native for portable Docker builds. Removed the incorrect comment.
- The multi-stage Dockerfile used file app to verify the binary but did not install the file package. Added file to the builder image package list.
- The MPI example divided total_n by nprocs and ignored any remainder when the process count did not evenly divide total_n. Replaced the partitioning with rank-based start/end bounds that cover the full interval for arbitrary process counts.
- The MPI sample declared an unused pi_approx variable. Removed it.
- The Docker Compose snippet used the obsolete top-level version field. Removed version: "3.8" so current Docker Compose no longer emits an obsolete-field warning.

## Review Notes
- Host gfortran and mpif90 were not installed, so Fortran compilation was verified inside Ubuntu 22.04 Docker containers.
- The main Fortran, MPI, and OpenMP examples compiled and ran successfully in an Ubuntu 22.04 container. The MPI sample was tested with -np 3 to exercise non-even partitioning.
- The basic Dockerfile built and ran successfully. The static linking command was verified in an Ubuntu 22.04 container and produced a statically linked executable; a full Docker build of the static Dockerfile was blocked by local Docker storage limits during apt package download, not by a Dockerfile syntax or package-name issue.
- Docker Compose configuration was validated with docker compose config after removing the obsolete version field.

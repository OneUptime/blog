# How to Containerize a Fortran Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Fortran, Containerization, DevOps, Scientific Computing, HPC

Description: Guide to containerizing Fortran applications with Docker, covering gfortran builds, MPI parallel computing, and scientific computing workflows.

---

Fortran remains the backbone of scientific and high-performance computing. Weather prediction models, computational fluid dynamics, molecular simulations, and financial modeling all depend on Fortran. Docker brings reproducibility to these workloads, ensuring that the exact compiler version, library versions, and runtime environment are captured in a portable image. This guide covers containerizing Fortran applications from simple numerical programs to MPI-enabled parallel computations.

## Prerequisites

Docker must be installed. Basic Fortran knowledge helps. We will use gfortran (GNU Fortran compiler) for our examples. Understanding of numerical computing concepts is helpful for the scientific computing sections.

## Creating a Sample Fortran Application

Let's build a numerical computation service that solves a system of linear equations.

Create the main program:

```fortran
! server.f90 - simple HTTP-like server using Fortran
! Performs matrix operations and outputs results
program docker_demo
    implicit none

    integer, parameter :: n = 100
    real(8), dimension(n, n) :: A
    real(8), dimension(n) :: b, x
    real(8) :: start_time, end_time
    integer :: i, j
    character(len=256) :: port_str
    integer :: port

    ! Get port from environment (for future use)
    call get_environment_variable('PORT', port_str)
    if (len_trim(port_str) == 0) port_str = '8080'
    read(port_str, *) port

    print *, 'Fortran application starting...'
    print *, 'Matrix size: ', n, 'x', n

    ! Initialize matrix A and vector b
    call random_seed()
    call random_number(A)
    call random_number(b)

    ! Make the matrix diagonally dominant for stability
    do i = 1, n
        A(i, i) = A(i, i) + real(n, 8)
    end do

    ! Time the computation
    call cpu_time(start_time)

    ! Solve Ax = b using Gaussian elimination
    call solve_linear_system(A, b, x, n)

    call cpu_time(end_time)

    ! Output results
    print '(A, F10.6, A)', ' Solve time: ', end_time - start_time, ' seconds'
    print '(A, F10.6)', ' Solution x(1) = ', x(1)
    print '(A, F10.6)', ' Solution x(n) = ', x(n)

    ! Verify: compute residual ||Ax - b||
    call verify_solution(A, b, x, n)

    print *, 'Computation complete.'

end program docker_demo

! Gaussian elimination with partial pivoting
subroutine solve_linear_system(A, b, x, n)
    implicit none
    integer, intent(in) :: n
    real(8), intent(inout) :: A(n, n), b(n)
    real(8), intent(out) :: x(n)
    real(8) :: factor, max_val, temp
    integer :: i, j, k, max_row

    ! Forward elimination with partial pivoting
    do k = 1, n - 1
        ! Find pivot
        max_val = abs(A(k, k))
        max_row = k
        do i = k + 1, n
            if (abs(A(i, k)) > max_val) then
                max_val = abs(A(i, k))
                max_row = i
            end if
        end do

        ! Swap rows if needed
        if (max_row /= k) then
            do j = k, n
                temp = A(k, j)
                A(k, j) = A(max_row, j)
                A(max_row, j) = temp
            end do
            temp = b(k)
            b(k) = b(max_row)
            b(max_row) = temp
        end if

        ! Eliminate
        do i = k + 1, n
            factor = A(i, k) / A(k, k)
            do j = k + 1, n
                A(i, j) = A(i, j) - factor * A(k, j)
            end do
            b(i) = b(i) - factor * b(k)
        end do
    end do

    ! Back substitution
    do i = n, 1, -1
        x(i) = b(i)
        do j = i + 1, n
            x(i) = x(i) - A(i, j) * x(j)
        end do
        x(i) = x(i) / A(i, i)
    end do

end subroutine solve_linear_system

! Verify the solution by computing the residual
subroutine verify_solution(A, b, x, n)
    implicit none
    integer, intent(in) :: n
    real(8), intent(in) :: A(n, n), b(n), x(n)
    real(8) :: residual, Ax_i
    integer :: i, j

    residual = 0.0d0
    do i = 1, n
        Ax_i = 0.0d0
        do j = 1, n
            Ax_i = Ax_i + A(i, j) * x(j)
        end do
        residual = residual + (Ax_i - b(i))**2
    end do
    residual = sqrt(residual)

    print '(A, E12.5)', ' Residual ||Ax - b|| = ', residual

end subroutine verify_solution
```

## Basic Dockerfile

```dockerfile
# Basic Fortran Dockerfile with gfortran
FROM ubuntu:22.04

# Install the GNU Fortran compiler
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gfortran \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Fortran source
COPY server.f90 ./

# Compile with optimization flags
# -O3: aggressive optimization
# -march=native: optimize for the build machine's CPU
# -o: output file name
RUN gfortran -O3 -o app server.f90

CMD ["./app"]
```

Build and run:

```bash
# Build the Fortran Docker image
docker build -t fortran-app:basic .

# Run the computation
docker run --rm fortran-app:basic
```

## Multi-Stage Build

```dockerfile
# Stage 1: Compile the Fortran program
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gfortran libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY *.f90 ./

# Compile with static linking for portability
RUN gfortran -O3 -static -o app server.f90

# Verify static linking
RUN file app && ldd app || echo "Statically linked"

# Stage 2: Minimal runtime
FROM scratch

COPY --from=builder /app/app /app

CMD ["/app"]
```

With static linking, the scratch-based image contains only the compiled binary, typically 1-2 MB.

## Fortran with LAPACK and BLAS

Most serious Fortran code uses LAPACK and BLAS for linear algebra. Here is how to include them:

```dockerfile
# Dockerfile with LAPACK/BLAS support
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gfortran libc6-dev \
    liblapack-dev libblas-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY *.f90 ./

# Link against LAPACK and BLAS
RUN gfortran -O3 -o app server.f90 -llapack -lblas

# Stage 2: Runtime with shared libraries
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    liblapack3 libblas3 libgfortran5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/app /app/app

CMD ["/app/app"]
```

For better performance, use OpenBLAS instead of the reference BLAS:

```dockerfile
# Use OpenBLAS for better performance
RUN apt-get install -y --no-install-recommends \
    libopenblas-dev
RUN gfortran -O3 -o app server.f90 -lopenblas
```

## MPI Parallel Computing

Many Fortran applications use MPI for parallel computing. Here is an MPI-enabled Dockerfile:

```fortran
! mpi_demo.f90 - MPI parallel computation
program mpi_demo
    use mpi
    implicit none

    integer :: ierr, rank, nprocs
    integer :: i, local_n
    real(8) :: local_sum, global_sum, pi_approx
    integer, parameter :: total_n = 100000000

    call MPI_Init(ierr)
    call MPI_Comm_rank(MPI_COMM_WORLD, rank, ierr)
    call MPI_Comm_size(MPI_COMM_WORLD, nprocs, ierr)

    if (rank == 0) then
        print *, 'Computing pi with', nprocs, 'processes'
    end if

    ! Each process computes its portion
    local_n = total_n / nprocs
    local_sum = 0.0d0
    do i = rank * local_n + 1, (rank + 1) * local_n
        local_sum = local_sum + 4.0d0 / (1.0d0 + ((dble(i) - 0.5d0) / dble(total_n))**2)
    end do
    local_sum = local_sum / dble(total_n)

    ! Reduce all local sums to global sum
    call MPI_Reduce(local_sum, global_sum, 1, MPI_DOUBLE_PRECISION, &
                    MPI_SUM, 0, MPI_COMM_WORLD, ierr)

    if (rank == 0) then
        print '(A, F18.15)', ' Computed pi = ', global_sum
        print '(A, E12.5)', ' Error = ', abs(global_sum - acos(-1.0d0))
    end if

    call MPI_Finalize(ierr)
end program mpi_demo
```

MPI Dockerfile:

```dockerfile
# Dockerfile for MPI-enabled Fortran application
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gfortran libopenmpi-dev openmpi-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY mpi_demo.f90 ./

# Compile with MPI Fortran wrapper
RUN mpif90 -O3 -o mpi_app mpi_demo.f90

# Stage 2: Runtime with MPI libraries
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libopenmpi3 openmpi-bin libgfortran5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/mpi_app /app/mpi_app

# Run with 4 MPI processes
CMD ["mpirun", "--allow-run-as-root", "-np", "4", "/app/mpi_app"]
```

Run with specific process count:

```bash
# Run with 8 MPI processes
docker run --rm fortran-mpi:latest mpirun --allow-run-as-root -np 8 /app/mpi_app
```

## The .dockerignore File

```text
# .dockerignore
.git/
*.o
*.mod
app
README.md
output/
```

## Docker Compose for Scientific Workflows

```yaml
# docker-compose.yml - scientific computing workflow
version: "3.8"
services:
  compute:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ./data/input:/data/input:ro
      - ./data/output:/data/output
    environment:
      - OMP_NUM_THREADS=4
    deploy:
      resources:
        limits:
          cpus: "4"
          memory: 4G

  # Visualization service for results
  jupyter:
    image: jupyter/scipy-notebook
    ports:
      - "8888:8888"
    volumes:
      - ./data/output:/home/jovyan/data:ro
      - ./notebooks:/home/jovyan/notebooks
```

## OpenMP Multithreading

Fortran with OpenMP enables shared-memory parallelism:

```fortran
! openmp_demo.f90 - OpenMP parallel computation
program openmp_demo
    use omp_lib
    implicit none
    integer, parameter :: n = 100000000
    real(8) :: sum, x, h
    integer :: i

    h = 1.0d0 / dble(n)
    sum = 0.0d0

    !$OMP PARALLEL DO PRIVATE(x) REDUCTION(+:sum)
    do i = 1, n
        x = h * (dble(i) - 0.5d0)
        sum = sum + 4.0d0 / (1.0d0 + x*x)
    end do
    !$OMP END PARALLEL DO

    sum = sum * h
    print '(A, F18.15)', 'Pi = ', sum
    print '(A, I4)', 'Threads used: ', omp_get_max_threads()
end program openmp_demo
```

```dockerfile
# Compile with OpenMP support
RUN gfortran -O3 -fopenmp -o app openmp_demo.f90
```

Run with thread control:

```bash
# Run with 8 OpenMP threads
docker run --rm -e OMP_NUM_THREADS=8 --cpus="8" fortran-omp:latest
```

## Compiler Options for Docker

```bash
# Key gfortran flags for Docker builds
gfortran -O3 server.f90             # Aggressive optimization
gfortran -O3 -static server.f90     # Static linking (smaller runtime image)
gfortran -O3 -march=x86-64 server.f90  # Portable x86-64 optimization
gfortran -O3 -fopenmp server.f90    # Enable OpenMP
gfortran -O3 -fcheck=all server.f90 # Enable runtime checks (debug)
```

Avoid `-march=native` in Docker builds because the binary may run on different hardware than the build machine.

## Monitoring Scientific Computing Workloads

Long-running Fortran computations benefit from monitoring. [OneUptime](https://oneuptime.com) can track container health and resource utilization. For batch jobs, set up alerts based on expected completion times so you know when a computation stalls or fails.

## Summary

Containerizing Fortran applications brings reproducibility to scientific computing. The multi-stage build pattern works well: compile with gfortran in the builder, copy the binary (statically linked if possible) to a minimal runtime. For applications using LAPACK, BLAS, MPI, or OpenMP, include the runtime libraries in the final image. Docker Compose can orchestrate multi-step scientific workflows that combine computation with visualization. The key consideration is matching container CPU and memory allocations to the workload's parallel computing requirements.

# Validation Summary: How to Set Up OpenMPI on Ubuntu for Parallel Computing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenMPI (MPI runtime and development libraries on Ubuntu)
- MPI C API (`MPI_Init`, `MPI_Comm_rank`, `MPI_Comm_size`, `MPI_Reduce`, `MPI_Get_processor_name`, `MPI_Finalize`)
- `mpicc`, `mpic++`, `mpirun` wrappers
- SSH key-based authentication for multi-node clusters (`ssh-keygen`, `ssh-copy-id`)
- OpenMPI hostfile syntax and multi-node execution (`--hostfile`, `-H`, `--display-map`)
- NFS for shared filesystem distribution
- environment-modules (`Tcl` modulefiles, `module use`, `module load`)
- `mpi4py` (Python MPI bindings, Monte Carlo pi estimation)
- OSU Micro-Benchmarks 7.2 (latency, bandwidth, allreduce)

## Sources Consulted
- Open MPI v5.0.x documentation — https://docs.open-mpi.org/en/v5.0.x/
- Ubuntu package metadata for `openmpi-bin` / `libopenmpi-dev` — https://packages.ubuntu.com/
- OSU Micro-Benchmarks downloads — https://mvapich.cse.ohio-state.edu/benchmarks/
- Downloaded `osu-micro-benchmarks-7.2.tar.gz` directly and inspected its directory layout
- Environment Modules documentation — https://modules.readthedocs.io/en/latest/INSTALL.html
- Ubuntu man pages for `module(1)` — https://manpages.ubuntu.com/manpages/xenial/man1/module.1.html
- MPI Standard 3.1/4.0 reference behavior for `MPI_Reduce`, `MPI_Comm_rank/size`, etc.

## Issues Found
1. **OSU Micro-Benchmarks directory layout was wrong for v7.2.** The post said `cd mpi/pt2pt` and `cd ../collective` to run the binaries, but starting with the 7.x series the OSU source tree was restructured. Inspecting the actual tarball confirmed the binaries land under `c/mpi/pt2pt/standard/` (for `osu_latency`, `osu_bw`) and `c/mpi/collective/blocking/` (for `osu_allreduce`). Updated both `cd` commands to match the real paths so the benchmark instructions actually work.

2. **Environment Modules initialization file was written to the wrong directory.** The post piped `module use /opt/modulefiles` into `/etc/environment.d/modules.sh`. `/etc/environment.d/` is a systemd directory whose files are parsed as KEY=VALUE environment definitions, not sourced as shell scripts, so the `module use` line would never execute. Changed it to `/etc/profile.d/modules-extra.sh` (which is sourced by the Ubuntu environment-modules package's `/etc/profile.d/modules.sh` initialization), switched the redirection from `tee -a` to `tee` (it's a new file, not an append target), and added the `chmod +x` so it is executed on login.

3. **Mislabelled communication pattern in the parallel sum intro.** The lead-in said the example uses "point-to-point communication," but the code actually uses `MPI_Reduce`, which is a collective. Reworded to "uses a collective reduction" to match the code.

## Review Notes
- Package list (`openmpi-bin openmpi-common libopenmpi-dev`), library path used in the modulefile (`/usr/lib/x86_64-linux-gnu/openmpi/lib`), and `dpkg -L libopenmpi-dev` lookup all match current Ubuntu LTS layouts.
- The C MPI program is standards-compliant and idiomatic; `MPI_Reduce` argument order (`sendbuf, recvbuf, count, datatype, op, root, comm`) is correct, and `MPI_MAX_PROCESSOR_NAME` is the right buffer size constant.
- The `parallel_sum` arithmetic (sum 0..999,999 = 499,999,500,000) fits comfortably in a `double`'s 53-bit mantissa, so the `printf` comparison is safe.
- The `mpi4py` snippet uses lowercase `comm.reduce` (pickle-based) rather than the buffer-protocol `Reduce`; this is fine for a single Python int but is significantly slower for numpy arrays — worth a caveat in a future revision but not incorrect.
- `--display-map` is the correct OpenMPI 4.x flag; OpenMPI 5.x renamed several diagnostics but `--display-map` remains accepted.
- The OSU download URL (`https://mvapich.cse.ohio-state.edu/download/mvapich/osu-micro-benchmarks-7.2.tar.gz`) is still reachable. Current latest is 7.5.2 (stable) / 8.0b2 (beta) — readers running the post a year from now may want to bump the version, but 7.2 is not broken.
- The `StrictHostKeyChecking no` + `UserKnownHostsFile /dev/null` SSH config trade off security for convenience inside a trusted cluster; common in HPC tutorials and not technically wrong, just worth noting.

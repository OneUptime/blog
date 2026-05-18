# Validation Summary: How to Set Up MPI Cluster on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenMPI (Ubuntu package `openmpi-bin`, version 4.1.x in Ubuntu 22.04/24.04)
- Ubuntu 22.04 LTS
- OpenSSH (passwordless key-based auth, `ssh-keygen`, `ssh-copy-id`)
- NFS (`nfs-kernel-server`, `nfs-common`, `/etc/exports`, `/etc/fstab`)
- C / `mpicc` compilation
- MPI API: `MPI_Init`, `MPI_Comm_size`, `MPI_Comm_rank`, `MPI_Get_processor_name`, `MPI_Send`, `MPI_Recv`, `MPI_Finalize`
- UCX / RDMA / InfiniBand transports
- `hostnamectl`, `/etc/hosts`
- OSU Micro-Benchmarks (mentioned)

## Sources Consulted
- Open MPI 4.1.x official documentation: https://www.open-mpi.org/doc/v4.1/
- Open MPI `mpirun` man page (v4.1.x): https://www.open-mpi.org/doc/v4.1/man1/mpirun.1.php
- Open MPI FAQ on UCX and InfiniBand: https://www.open-mpi.org/faq/?category=openfabrics
- MPI 3.1 standard (function signatures for `MPI_Get_processor_name`, `MPI_Send`, `MPI_Recv`): https://www.mpi-forum.org/docs/mpi-3.1/mpi31-report.pdf
- Ubuntu package metadata for `openmpi-bin` (4.1.6-7ubuntu2)
- Ubuntu manpages for `adduser(8)`, `exports(5)`, `hostnamectl(1)`, `ssh-keygen(1)`, `ssh-copy-id(1)`
- OSU Micro-Benchmarks site: https://mvapich.cse.ohio-state.edu/benchmarks/

## Issues Found
1. **Hostname comment typo (Setting Up Hostnames section).** The third sub-block was labeled `# On head-node:` but actually ran `sudo hostnamectl set-hostname compute-node-02`. Corrected the comment to `# On compute-node-02:` so the instruction reflects which node the reader should be on.

2. **Deprecated/removed BTLs in the InfiniBand example (Performance Tuning > Using High-Speed Interconnects).** The original command was `--mca btl openib,self,sm`. Two problems against Open MPI 4.x (which ships on Ubuntu 22.04/24.04):
   - The `openib` BTL is deprecated in Open MPI 4.x and was removed in 5.0. The Open MPI project explicitly recommends UCX (PML) for InfiniBand instead.
   - The `sm` BTL was removed in Open MPI 1.8 in favor of `vader`; selecting `sm` on Open MPI 4.x does not provide shared-memory transport.
   Replaced with the modern recommended invocation `--mca pml ucx --mca osc ucx` and added `libucx0` to the install line. Also reworded the comment so it no longer implies that Mellanox OFED is being installed (the package set is `rdma-core` from upstream Linux, not the OFED distribution).

3. **Insecure URL for OSU benchmarks.** Updated `http://mvapich.cse.ohio-state.edu/benchmarks/` to `https://` (the site supports HTTPS and the redirect is the canonical form).

## Review Notes
- The C code for `hello_mpi.c` and `send_recv.c` is correct per the MPI 3.1 standard. Function signatures, argument orders, and constants (`MPI_INT`, `MPI_COMM_WORLD`, `MPI_STATUS_IGNORE`) are all valid.
- `adduser --uid 2000 mpiuser` is supported by the Debian/Ubuntu `adduser` Perl wrapper; on Ubuntu 24.04 the new Rust-based `adduser` also accepts `--uid`. Note that `adduser` will still prompt interactively for things like the password and GECOS fields — that is consistent with the post's mention of either setting a password or using SSH keys.
- The NFS export string `/shared 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)` is syntactically correct, but `no_root_squash` is a privilege-escalation footgun in a multi-tenant environment. Acceptable for an HPC lab cluster as written, but worth a security caveat in a future revision.
- Disabling `StrictHostKeyChecking` and pointing `UserKnownHostsFile` to `/dev/null` is a common HPC convention for trusted private networks but does weaken MITM protection. Reasonable for an isolated cluster subnet; documented as such by the surrounding context.
- The hostfile syntax `head-node slots=4` is correct for Open MPI; `slots` is the canonical key (MPICH uses different syntax, but this guide is Open MPI specific).
- `--bind-to core --map-by core` are valid `mpirun` options in Open MPI 4.1.x.
- Future-proofing: when readers move to Open MPI 5.x (Ubuntu 25.04+), the `openib` BTL will be gone entirely and UCX/OFI become the only RDMA paths — the updated InfiniBand snippet remains correct.

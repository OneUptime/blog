# Run ib_write_bw on the Intended Path and Memory Type

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Perftest, InfiniBand, RoCE, GPUDirect RDMA, Benchmarking

Description: Build a reproducible ib_write_bw test that pins the HCA, port, GID, direction, message size, and host or GPU memory path.

---

`ib_write_bw` is easy to start and easy to misinterpret. By default, it can select the first RDMA device, use port 1, allocate ordinary host memory, test one direction, and use a separate connection setup path. A high or low number is meaningless until those choices are explicit.

The goal is not to find the longest command line. It is to state one hypothesis, select the path that tests it, and capture enough metadata for another operator to reproduce the result.

## Define the Question First

These are different benchmarks:

- maximum one-way RDMA Write payload bandwidth through HCA A, port 1;
- aggregate bidirectional bandwidth;
- scaling across several QPs;
- host memory versus CUDA device memory;
- native InfiniBand versus RoCE on a VPI adapter;
- a specific GID/VLAN path;
- application-like message sizes versus peak large-message throughput.

Write the question into the result record. Do not compare a bidirectional, multi-QP GPU test with a one-way, one-QP host-memory result as if they measured the same path.

## Inventory Both Endpoints

Capture this before the test:

~~~console
$ ib_write_bw --version
$ ib_write_bw --help
$ rdma link show
$ ibv_devinfo
$ lspci -nnk
~~~

The official perftest project instructs users to use the same options on both server and client and notes compatibility breaks between some releases. Use the same perftest build on both sides whenever possible.

Map the RDMA name to PCI and link layer:

~~~console
$ readlink -f /sys/class/infiniband/mlx5_0/device
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
$ cat /sys/class/infiniband/mlx5_0/ports/1/rate
~~~

`mlx5_0` does not identify native InfiniBand by itself. An mlx5 port can expose an Ethernet link layer for RoCE.

## Pin the Device and Port

A controlled host-memory baseline can use:

~~~console
# Server
$ ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 --report_gbits

# Client, with the same test options
$ ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 \
    --report_gbits server-rdma-address
~~~

Here `-d` selects the RDMA device, `-i` selects its port, `-s` sets the message size, and `-D` selects duration mode. Confirm the option names in the installed binary because perftest evolves.

The server address used to establish the test is not by itself proof of the verbs data path. Without an explicit RDMA CM mode, perftest can exchange connection information over its control channel and then run the data test on the HCA selected by `-d` and `-i`. An IPoIB, management, or Ethernet address used for setup does not necessarily carry the measured RDMA Writes.

Use `-R` only when the question specifically requires QPs established through RDMA CM. The official README defines `-R, --rdma_cm` as connecting QPs with RDMA CM and running the test on those QPs. It changes connection setup and path selection, so record it as part of the benchmark, not as a harmless logging switch. With `-R`, RDMA CM route resolution can select a different device, port, or GID than `-d`, `-i`, or `-x`; verify the values perftest reports, and use `--bind_source_ip` when supported if the source address must constrain the route.

## Select the Correct GID for RoCE

For native InfiniBand, LID and Subnet Manager path state are normally central. For RoCE, GID selection ties the RDMA port to a netdev, address, VLAN, and RoCE version.

Inspect the current table:

~~~console
$ gid_dir=/sys/class/infiniband/mlx5_0/ports/1
$ for gid in "$gid_dir"/gids/*; do
    index=${gid##*/}
    printf '%s: gid=%s type=%s netdev=%s\n' "$index" \
      "$(cat "$gid")" \
      "$(cat "$gid_dir/gid_attrs/types/$index")" \
      "$(cat "$gid_dir/gid_attrs/ndevs/$index")"
  done
$ ip -br address
$ rdma link show
~~~

When the test is not using `-R` and requires a specific GID, pass each endpoint's locally correct `-x, --gid-index` value. The two numeric values need not match. Do not copy an index from another host because GID indices can differ with netdev, VLAN, IP address, driver, and namespace configuration.

For a container, inventory the table inside the container. Host GID visibility does not prove the pod has the matching netdev and address context.

## Be Explicit About Direction and Parallelism

The default bandwidth test is unidirectional. `-b, --bidirectional` makes both endpoints generate traffic. Perftest reports differ by version and mode, so label the result one-way or bidirectional and preserve the raw output.

Queue depth, post lists, number of QPs, CQ moderation, and inline size can affect the result. Begin with defaults plus an explicit device, port, size, and duration. Then vary one parameter at a time:

~~~console
$ ib_write_bw -d mlx5_0 -i 1 -a --report_gbits server-rdma-address
$ ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 -q 4 \
    --report_gbits server-rdma-address
~~~

`-a` sweeps message sizes. `-q` availability and exact semantics should be verified with the installed `--help`. Do not use many QPs simply to reach line rate without reporting them; the result then measures aggregate concurrency, not single-QP behavior.

## Distinguish Host Memory From GPU Memory

The normal test buffer is host memory. Running `ib_write_bw` on a GPU server does not make it a GPUDirect RDMA test.

Perftest must be configured and built with CUDA support before `--use_cuda` is available. Since release 25.07, configure automatically detects `cuda.h` in the standard CUDA location; older releases require `CUDA_H_PATH`, which current builds retain for compatibility. The runtime forms are:

~~~console
# Server
$ ib_write_bw -d mlx5_0 -i 1 --use_cuda=0 \
    -s 8388608 -D 20 --report_gbits

# Client
$ ib_write_bw -d mlx5_0 -i 1 --use_cuda=0 \
    -s 8388608 -D 20 --report_gbits server-rdma-address
~~~

The numeric CUDA device index is local to each host. Map it to a PCI BDF before selecting it:

~~~console
$ nvidia-smi --query-gpu=index,pci.bus_id,name --format=csv
$ nvidia-smi topo -m
~~~

Recent perftest releases also provide a CUDA bus-ID selector. Prefer a full PCI identity when automation must survive device reordering, but use only options present in the installed version.

DMA-BUF and the legacy peer-memory path are different GPUDirect RDMA mechanisms. The perftest README documents `--use_cuda_dmabuf` together with `--use_cuda` and lists minimum CUDA, open-kernel-module, and build requirements for its DMA-BUF support. Record whether DMA-BUF was used and retain the initialization and memory-registration output. `--use_cuda` proves that the test requested a CUDA buffer, but it does not by itself distinguish DMA-BUF from a legacy peer-memory registration path.

## Control NUMA and CPU Placement

Host-memory bandwidth can be limited by remote NUMA allocation; GPU bandwidth can be limited by GPU-to-HCA PCIe topology. Record:

~~~console
$ cat /sys/class/infiniband/mlx5_0/device/numa_node
$ nvidia-smi topo -m
$ lscpu -e=CPU,NODE,SOCKET,CORE
~~~

For a host-memory comparison, bind the process and newly allocated buffer to the HCA-local node:

~~~console
$ numactl --cpunodebind=1 --membind=1 \
    ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 --report_gbits
~~~

Choose the actual local node on each endpoint. Recent perftest builds may offer `--pin_cores` and `--numa_node`; do not assume older packaged builds support them.

## Collect Evidence Alongside the Number

For every result, retain:

- exact server and client commands;
- raw output and perftest versions;
- HCA, port, PCI BDF, link layer, active rate, MTU, and GID index;
- one-way or bidirectional mode, message size, duration/iterations, QPs, and queue depth;
- buffer allocation type (host or CUDA device memory) and, for CUDA, registration path (DMA-BUF or legacy peer memory);
- CPU, memory, GPU, and HCA topology;
- port and PCIe counter deltas during the run.

Repeat enough times to show variance and run an order-controlled A/B test. If host memory is fast and GPU memory is slow, focus on GPUDirect support and GPU-HCA topology. If both stop at the same ceiling, inspect link rate, PCIe width, NUMA, and benchmark settings.

## Official Documentation

- [linux-rdma perftest: supported tests, options, and methodology](https://github.com/linux-rdma/perftest)
- [perftest source: current device, affinity, and CUDA option descriptions](https://github.com/linux-rdma/perftest/blob/master/src/perftest_parameters.c)
- [rdma-core: device and link inspection tools](https://github.com/linux-rdma/rdma-core)
- [NVIDIA CUDA: current GPUDirect RDMA documentation](https://docs.nvidia.com/cuda/gpudirect-rdma/index.html)
- [NVIDIA GPU Operator: DMA-BUF and legacy nvidia-peermem paths](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html)

## Conclusion

An `ib_write_bw` result is valid only for the path it explicitly selected. Pin the HCA, port, and per-node GID for regular verbs QPs; with `-R`, constrain and verify the RDMA CM-resolved path. Keep server and client options symmetric, and label direction and parallelism. Most importantly, state whether the buffer was ordinary host memory or deliberately selected GPU device memory and, for GPU memory, whether DMA-BUF or the legacy peer-memory path was used.

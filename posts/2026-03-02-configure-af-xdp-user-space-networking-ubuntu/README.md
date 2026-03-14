# How to Configure AF_XDP for User-Space Networking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AF_XDP, Networking, eBPF, High Performance

Description: Configure AF_XDP sockets on Ubuntu to move packet processing into user space with near-kernel-bypass performance, enabling custom high-speed networking applications.

---

AF_XDP is a socket type introduced in Linux 4.18 that allows user-space applications to process packets at extremely high speeds by bypassing most of the kernel networking stack. Unlike DPDK which requires dedicated drivers and full kernel bypass, AF_XDP works through the standard kernel driver model while still achieving near-line-rate performance.

The key insight behind AF_XDP is a shared memory area (called UMEM) between the kernel and user space. Packets are placed directly into this memory by the NIC driver, and your application reads them without any copying. This eliminates the costly memory copies that dominate CPU usage in traditional socket I/O.

## How AF_XDP Works

AF_XDP uses several shared ring buffers between kernel and user space:

- **UMEM**: A large memory region divided into frames - the actual packet data lives here
- **FILL queue**: User space tells the kernel which UMEM frames to use for incoming packets
- **COMPLETION queue**: Kernel tells user space which UMEM frames are done being transmitted
- **RX ring**: Kernel notifies user space of received packets
- **TX ring**: User space submits packets for transmission

An XDP program (eBPF) running in the kernel decides which packets to redirect to the AF_XDP socket using `XDP_REDIRECT`. Packets not redirected follow the normal kernel stack path.

## Prerequisites

```bash
# Check kernel version (needs 4.18+ for AF_XDP, 5.x recommended)
uname -r

# Install build dependencies
sudo apt update
sudo apt install -y \
    clang \
    llvm \
    libelf-dev \
    libbpf-dev \
    linux-headers-$(uname -r) \
    pkg-config \
    libz-dev \
    build-essential
```

## Setting Up the UMEM and AF_XDP Socket

The following example shows how to set up AF_XDP using the `libxdp` library and libbpf. First, install `libxdp`:

```bash
# Clone xdp-tools which includes libxdp
git clone https://github.com/xdp-project/xdp-tools.git
cd xdp-tools
./configure
make
sudo make install
sudo ldconfig
```

## Writing an AF_XDP Application

Here is a basic AF_XDP application skeleton that receives packets into user space:

```c
// af_xdp_user.c - Basic AF_XDP receive application
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <poll.h>
#include <net/if.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <linux/if_xdp.h>
#include <linux/if_link.h>
#include <bpf/bpf.h>
#include <bpf/libbpf.h>

// UMEM configuration
#define UMEM_FRAME_SIZE    4096
#define UMEM_NUM_FRAMES    4096
#define UMEM_SIZE          (UMEM_FRAME_SIZE * UMEM_NUM_FRAMES)

// Ring sizes must be powers of 2
#define RX_RING_SIZE       2048
#define TX_RING_SIZE       2048
#define FILL_RING_SIZE     4096
#define COMP_RING_SIZE     4096

struct xsk_umem_info {
    struct xsk_ring_prod fq;   // Fill queue
    struct xsk_ring_cons cq;   // Completion queue
    struct xsk_umem *umem;
    void *buffer;              // UMEM memory region
};

struct xsk_socket_info {
    struct xsk_ring_cons rx;   // RX ring
    struct xsk_ring_prod tx;   // TX ring
    struct xsk_umem_info *umem;
    struct xsk_socket *xsk;
    unsigned long rx_npkts;
};

static struct xsk_umem_info *create_umem(void)
{
    struct xsk_umem_info *umem;
    struct xsk_umem_config cfg = {
        .fill_size = FILL_RING_SIZE,
        .comp_size = COMP_RING_SIZE,
        .frame_size = UMEM_FRAME_SIZE,
        .frame_headroom = 0,
    };
    int ret;

    umem = calloc(1, sizeof(*umem));
    if (!umem) return NULL;

    // Allocate UMEM buffer (must be page-aligned)
    ret = posix_memalign(&umem->buffer, getpagesize(), UMEM_SIZE);
    if (ret) {
        free(umem);
        return NULL;
    }

    // Register with kernel
    ret = xsk_umem__create(&umem->umem, umem->buffer, UMEM_SIZE,
                           &umem->fq, &umem->cq, &cfg);
    if (ret) {
        free(umem->buffer);
        free(umem);
        return NULL;
    }

    return umem;
}

static struct xsk_socket_info *create_socket(struct xsk_umem_info *umem,
                                              const char *ifname, int queue_id)
{
    struct xsk_socket_info *xsk;
    struct xsk_socket_config cfg = {
        .rx_size = RX_RING_SIZE,
        .tx_size = TX_RING_SIZE,
        .libbpf_flags = 0,
        .xdp_flags = XDP_FLAGS_UPDATE_IF_NOEXIST,
        .bind_flags = XDP_COPY,  // Use XDP_ZEROCOPY for best performance
    };
    int ret;

    xsk = calloc(1, sizeof(*xsk));
    if (!xsk) return NULL;

    xsk->umem = umem;

    ret = xsk_socket__create(&xsk->xsk, ifname, queue_id,
                             umem->umem, &xsk->rx, &xsk->tx, &cfg);
    if (ret) {
        free(xsk);
        return NULL;
    }

    return xsk;
}

static void rx_and_process(struct xsk_socket_info *xsk)
{
    unsigned int rcvd, i;
    uint32_t idx_rx = 0, idx_fq = 0;

    // Peek at received packets
    rcvd = xsk_ring_cons__peek(&xsk->rx, 64, &idx_rx);
    if (!rcvd) return;

    for (i = 0; i < rcvd; i++) {
        uint64_t addr = xsk_ring_cons__rx_desc(&xsk->rx, idx_rx)->addr;
        uint32_t len  = xsk_ring_cons__rx_desc(&xsk->rx, idx_rx)->len;
        char *pkt = xsk_umem__get_data(xsk->umem->buffer, addr);

        // Process the packet - it's at pkt, len bytes long
        // Example: print first few bytes
        printf("Received packet: %u bytes, first byte: 0x%02x\n",
               len, (unsigned char)pkt[0]);

        idx_rx++;
    }

    // Release consumed descriptors back to RX ring
    xsk_ring_cons__release(&xsk->rx, rcvd);
    xsk->rx_npkts += rcvd;

    // Refill the fill queue with free UMEM frames
    // (simplified - production code needs proper frame tracking)
    xsk_ring_prod__reserve(&xsk->umem->fq, rcvd, &idx_fq);
    for (i = 0; i < rcvd; i++) {
        *xsk_ring_prod__fill_addr(&xsk->umem->fq, idx_fq++) =
            i * UMEM_FRAME_SIZE;  // Simplified frame addressing
    }
    xsk_ring_prod__submit(&xsk->umem->fq, rcvd);
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <interface>\n", argv[0]);
        return 1;
    }

    const char *ifname = argv[1];
    struct xsk_umem_info *umem = create_umem();
    if (!umem) {
        perror("Failed to create UMEM");
        return 1;
    }

    struct xsk_socket_info *xsk = create_socket(umem, ifname, 0);
    if (!xsk) {
        perror("Failed to create XDP socket");
        return 1;
    }

    printf("AF_XDP socket created on %s, entering receive loop\n", ifname);

    // Main receive loop
    while (1) {
        // Wait for packets using poll
        struct pollfd fds = {
            .fd = xsk_socket__fd(xsk->xsk),
            .events = POLLIN,
        };
        poll(&fds, 1, 1000);
        rx_and_process(xsk);
    }

    xsk_socket__delete(xsk->xsk);
    xsk_umem__delete(umem->umem);
    return 0;
}
```

## Writing the XDP Kernel Program to Redirect to AF_XDP

The kernel-side XDP program redirects packets to the AF_XDP socket:

```c
// af_xdp_kern.c - Redirect all packets to AF_XDP socket
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

// Map for the AF_XDP socket - populated by user space
struct {
    __uint(type, BPF_MAP_TYPE_XSKMAP);
    __uint(max_entries, 64);  // Max queue count
    __type(key, int);
    __type(value, int);
} xsks_map SEC(".maps");

SEC("xdp")
int xdp_redirect_xsk(struct xdp_md *ctx)
{
    int queue_id = ctx->rx_queue_index;

    // Try to redirect to the AF_XDP socket for this queue
    // If no socket is registered for this queue, pass to kernel
    return bpf_redirect_map(&xsks_map, queue_id, XDP_PASS);
}

char _license[] SEC("license") = "GPL";
```

Compile:

```bash
clang -O2 -g -target bpf \
    -I /usr/include/$(uname -m)-linux-gnu \
    -c af_xdp_kern.c \
    -o af_xdp_kern.o
```

## Using xdpsock Sample Application

The Linux kernel source includes a full reference implementation:

```bash
# Install kernel source and build tools
sudo apt install linux-source build-essential

# Extract and find the sample
cd /usr/src/linux-source-*/
ls samples/bpf/xdpsock*.c

# Build the sample
make -C samples/bpf M=samples/bpf
```

Run `xdpsock` to test AF_XDP:

```bash
# Receive mode - dump packet statistics
sudo ./samples/bpf/xdpsock -i eth0 -r

# TX mode - transmit test packets
sudo ./samples/bpf/xdpsock -i eth0 -t

# Zero-copy mode (requires driver support)
sudo ./samples/bpf/xdpsock -i eth0 -r -z
```

## Zero-Copy Mode

Zero-copy mode is where AF_XDP really shines. It requires NIC driver support but eliminates all memory copies:

```bash
# Check if driver supports zero-copy
ethtool -i eth0 | grep driver
# Drivers with zero-copy: mlx5, i40e, ixgbe, ice

# Enable zero-copy when creating socket
# Change XDP_COPY to XDP_ZEROCOPY in bind_flags
```

Zero-copy allows the NIC DMA engine to write directly into UMEM frames, completely eliminating kernel-to-user copies.

## Performance Tuning

### CPU Pinning

AF_XDP performance depends on keeping the NIC queue, XDP program, and user-space application on the same CPU core:

```bash
# Pin the application to a specific CPU
taskset -c 2 ./af_xdp_app eth0

# Pin the NIC queue interrupt to the same CPU
IRQ=$(grep "eth0-TxRx-2" /proc/interrupts | awk '{print $1}' | tr -d ':')
echo 4 > /proc/irq/$IRQ/smp_affinity  # CPU 2 = bitmask 4
```

### Busy Polling

Instead of using `poll()`, busy-poll the socket for minimum latency:

```bash
# Enable busy polling globally
echo 50 > /proc/sys/net/core/busy_read
echo 50 > /proc/sys/net/core/busy_poll
```

Or in your application, set `SO_BUSY_POLL` socket option:

```c
int timeout = 20; // microseconds
setsockopt(xsk_socket__fd(xsk->xsk), SOL_SOCKET,
           SO_BUSY_POLL, &timeout, sizeof(timeout));
```

## Troubleshooting

**Permission denied when creating socket:**

```bash
# AF_XDP requires CAP_NET_RAW or root
sudo ./af_xdp_app eth0

# Or grant capability
sudo setcap cap_net_raw+ep ./af_xdp_app
```

**Low performance with XDP_COPY:**

Check if your driver supports native XDP and zero-copy. Generic XDP mode adds overhead that limits performance.

**Packets not arriving:**

Verify the XSKMAP is populated with your socket's file descriptor. The user-space application must register its socket FD in the XSKMAP after the XDP program loads.

## Summary

AF_XDP provides a middle ground between traditional kernel networking and full kernel bypass (DPDK). User-space applications get direct access to packet data through shared memory, while the kernel retains control of the driver and hardware. Zero-copy mode with native driver support can achieve 10-40 Mpps per core, making AF_XDP suitable for high-performance applications like custom load balancers, packet analyzers, and stateless firewalls.

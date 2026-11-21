using System.Buffers;
using System.Net;
using System.Net.Sockets;

static async Task<int> ReceiveChunkAsync(
    Socket socket,
    SemaphoreSlim receiveSlots,
    Func<ReadOnlyMemory<byte>, CancellationToken, ValueTask> consume,
    CancellationToken cancellationToken)
{
    await receiveSlots.WaitAsync(cancellationToken);
    byte[]? buffer = null;
    try
    {
        buffer = ArrayPool<byte>.Shared.Rent(16 * 1024);
        int count = await socket.ReceiveAsync(
            buffer.AsMemory(0, 16 * 1024), SocketFlags.None, cancellationToken);
        if (count != 0) await consume(buffer.AsMemory(0, count), cancellationToken);
        return count;
    }
    finally
    {
        if (buffer is not null) ArrayPool<byte>.Shared.Return(buffer, clearArray: true);
        receiveSlots.Release();
    }
}

using var listener = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
listener.Bind(new IPEndPoint(IPAddress.Loopback, 0));
listener.Listen(1);
using var client = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
var accepting = listener.AcceptAsync();
await client.ConnectAsync(listener.LocalEndPoint!);
using var server = await accepting;
using var slots = new SemaphoreSlim(2, 2);
byte[] payload = [1, 2, 3];
int sent = 0;
while (sent < payload.Length) sent += await client.SendAsync(payload.AsMemory(sent), SocketFlags.None);
int received = await ReceiveChunkAsync(server, slots, (data, _) =>
{
    if (!data.Span.SequenceEqual(payload.AsSpan(0, data.Length))) throw new Exception("payload mismatch");
    return ValueTask.CompletedTask;
}, CancellationToken.None);
if (received <= 0 || slots.CurrentCount != 2) throw new Exception("receive failure");
while (received < payload.Length) received += await ReceiveChunkAsync(server, slots, (_, _) => ValueTask.CompletedTask, CancellationToken.None);
using var pendingCancel = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
try { await ReceiveChunkAsync(server, slots, (_, _) => ValueTask.CompletedTask, pendingCancel.Token); throw new Exception("expected pending cancellation"); }
catch (OperationCanceledException) { }
if (slots.CurrentCount != 2) throw new Exception("pending slot leak");
using var canceled = new CancellationTokenSource();
canceled.Cancel();
try { await ReceiveChunkAsync(server, slots, (_, _) => ValueTask.CompletedTask, canceled.Token); throw new Exception("expected cancellation"); }
catch (OperationCanceledException) { }
if (slots.CurrentCount != 2) throw new Exception("slot leak");
Console.WriteLine($"loopback bytes={received}; cancellation and slots passed");

import java.time.Duration;
import tech.ydb.common.transaction.TxMode;
import tech.ydb.core.grpc.GrpcTransport;
import tech.ydb.query.QueryClient;
import tech.ydb.query.tools.SessionRetryContext;

public final class NativeRead implements AutoCloseable {
    private final QueryClient client;
    private final SessionRetryContext retry;

    // The caller owns the configured transport and must close it after this object.
    public NativeRead(GrpcTransport transport) {
        client = QueryClient.newClient(transport)
                .sessionPoolMinSize(0).sessionPoolMaxSize(16).build();
        retry = SessionRetryContext.create(client)
                .maxRetries(3).idempotent(true)
                .sessionCreationTimeout(Duration.ofSeconds(5)).build();
    }

    public void checkQuery() {
        retry.supplyResult(session -> session.createQuery("SELECT 1;", TxMode.NONE).execute())
                .join().getStatus().expectSuccess("Read probe failed");
    }

    @Override public void close() { client.close(); }
}

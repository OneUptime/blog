import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerConfig;

public final class YdbConsumerConfig {
    private YdbConsumerConfig() {}

    public static Map<String, Object> forYdb(Map<String, Object> base) {
        Map<String, Object> result = new HashMap<>(base);
        result.put(ConsumerConfig.CHECK_CRCS_CONFIG, false);
        return result;
    }
}

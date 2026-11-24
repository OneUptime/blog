import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;

public final class ConfigCheck {
    public static void main(String[] args) {
        Map<String, Object> base = new HashMap<>();
        base.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        base.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        base.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        base.put("security.protocol", "SASL_SSL");
        if (!Boolean.TRUE.equals(ConsumerConfig.configDef().parse(base).get("check.crcs"))) {
            throw new AssertionError("Unexpected Kafka default");
        }
        base.put("check.crcs", true);
        Map<String, Object> configured = YdbConsumerConfig.forYdb(base);
        Map<String, Object> parsed = ConsumerConfig.configDef().parse(configured);
        if (!Boolean.FALSE.equals(parsed.get("check.crcs"))) {
            throw new AssertionError("YDB override missing");
        }
        if (!Boolean.TRUE.equals(base.get("check.crcs"))) {
            throw new AssertionError("Shared input was modified");
        }
        if (!"SASL_SSL".equals(parsed.get("security.protocol"))) {
            throw new AssertionError("Transport configuration changed");
        }
        System.out.println("Default, override, input isolation and TLS preservation passed");
    }
}

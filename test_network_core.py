import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from network_core import evaluate_status, parse_ports, validate_private_ipv4


class NetworkCoreTests(unittest.TestCase):
    def test_accepts_private_ipv4_ranges(self):
        for address in ("10.0.0.1", "172.16.4.8", "172.31.255.254", "192.168.1.25", "127.0.0.1"):
            with self.subTest(address=address):
                self.assertEqual(validate_private_ipv4(address), address)

    def test_rejects_public_and_invalid_addresses(self):
        for address in ("8.8.8.8", "172.32.0.1", "192.169.1.2", "not-an-ip", "2001:db8::1"):
            with self.subTest(address=address):
                with self.assertRaises(ValueError):
                    validate_private_ipv4(address)

    def test_parse_ports_deduplicates_and_defaults(self):
        self.assertEqual(parse_ports("80,443,80"), [80, 443])
        self.assertEqual(parse_ports(""), [80, 443])
        self.assertEqual(parse_ports([22, 443]), [22, 443])

    def test_parse_ports_rejects_invalid_values_and_large_lists(self):
        for value in ("0", "65536", "abc", ",".join(str(n) for n in range(1, 22))):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    parse_ports(value)

    def test_monitoring_decision_rules(self):
        self.assertTrue(evaluate_status("icmp", True, []))
        self.assertFalse(evaluate_status("icmp", False, [443]))
        self.assertTrue(evaluate_status("tcp", False, [443]))
        self.assertFalse(evaluate_status("tcp", True, []))
        self.assertTrue(evaluate_status("both", True, []))
        self.assertTrue(evaluate_status("both", False, [443]))
        self.assertFalse(evaluate_status("both", False, []))


if __name__ == "__main__":
    unittest.main()

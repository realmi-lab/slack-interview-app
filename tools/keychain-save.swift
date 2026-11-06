import Foundation
import Security

let allowed = ["slack-interview-bot-token": "xoxb-", "slack-interview-app-token": "xapp-"]
do {
    let input = FileHandle.standardInput.readDataToEndOfFile()
    guard let items = try JSONSerialization.jsonObject(with: input) as? [String: String],
          items.count == 2 else { exit(2) }
    for (service, prefix) in allowed {
        guard let value = items[service], value.hasPrefix(prefix), value.count < 2048 else { exit(2) }
    }
    for service in allowed.keys.sorted() {
        let match: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: service,
                                    kSecAttrAccount as String: "slack-interview"]
        let data = items[service]!.data(using: .utf8)!
        var item = match
        item[kSecValueData as String] = data
        let result = SecItemAdd(item as CFDictionary, nil)
        if result == errSecDuplicateItem {
            guard SecItemUpdate(match as CFDictionary, [kSecValueData as String: data] as CFDictionary) == errSecSuccess else { exit(3) }
        } else if result != errSecSuccess { exit(3) }
    }
} catch { exit(2) }

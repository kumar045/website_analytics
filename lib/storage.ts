import { promises as fs } from "fs"
import path from "path"

// In-memory storage as fallback
const memoryStore: Record<string, string> = {}

// Check if we're in a Node.js environment with file system access
const hasFileSystemAccess = typeof process !== "undefined" && process.versions && process.versions.node

// Storage directory for local development
const STORAGE_DIR = path.join(process.cwd(), ".storage")

// Create storage directory if it doesn't exist (in development)
async function ensureStorageDir() {
  if (hasFileSystemAccess) {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true })
    } catch (error) {
      console.error("Failed to create storage directory:", error)
    }
  }
}

// Initialize storage
ensureStorageDir()

// Function to sanitize keys for file system storage
function sanitizeKey(key: string): string {
  // Replace problematic characters with safe alternatives
  return key
    .replace(/:/g, "_colon_")
    .replace(/\//g, "_slash_")
    .replace(/\\/g, "_backslash_")
    .replace(/\?/g, "_question_")
    .replace(/&/g, "_amp_")
    .replace(/=/g, "_equals_")
    .replace(/\./g, "_dot_")
    .replace(/https?_colon__slash__slash_/g, "")
    .replace(/[<>:"\\|?*]/g, "_") // Replace any other invalid file characters
}

export const storage = {
  // Set a value in storage
  async set(key: string, value: any): Promise<void> {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value)

    if (hasFileSystemAccess) {
      try {
        await ensureStorageDir()
        const safeKey = sanitizeKey(key)
        await fs.writeFile(path.join(STORAGE_DIR, `${safeKey}.json`), stringValue, "utf-8")

        // Also store the mapping from original key to safe key for retrieval
        memoryStore[`key_map:${key}`] = safeKey
      } catch (error) {
        console.error(`Error writing to file storage for key ${key}:`, error)
        // Fallback to memory storage
        memoryStore[key] = stringValue
      }
    } else {
      // Use memory storage
      memoryStore[key] = stringValue
    }
  },

  // Get a value from storage
  async get<T>(key: string): Promise<T | null> {
    if (hasFileSystemAccess) {
      try {
        // Check if we have a mapping for this key
        const safeKey = memoryStore[`key_map:${key}`] || sanitizeKey(key)
        const filePath = path.join(STORAGE_DIR, `${safeKey}.json`)
        const data = await fs.readFile(filePath, "utf-8")
        return JSON.parse(data) as T
      } catch (error) {
        // If file doesn't exist or can't be read, check memory store
        if (memoryStore[key]) {
          return typeof memoryStore[key] === "string" && memoryStore[key].startsWith("{")
            ? (JSON.parse(memoryStore[key]) as T)
            : (memoryStore[key] as unknown as T)
        }
        return null
      }
    } else {
      // Use memory storage
      if (memoryStore[key]) {
        return typeof memoryStore[key] === "string" && memoryStore[key].startsWith("{")
          ? (JSON.parse(memoryStore[key]) as T)
          : (memoryStore[key] as unknown as T)
      }
      return null
    }
  },

  // Delete a value from storage
  async del(key: string): Promise<void> {
    if (hasFileSystemAccess) {
      try {
        const safeKey = memoryStore[`key_map:${key}`] || sanitizeKey(key)
        const filePath = path.join(STORAGE_DIR, `${safeKey}.json`)
        await fs.unlink(filePath)

        // Also remove the key mapping
        delete memoryStore[`key_map:${key}`]
      } catch (error) {
        // Ignore errors if file doesn't exist
      }
    }

    // Also remove from memory store
    delete memoryStore[key]
  },

  // List all keys with a specific prefix
  async keys(prefix: string): Promise<string[]> {
    const keys: string[] = []

    if (hasFileSystemAccess) {
      try {
        const files = await fs.readdir(STORAGE_DIR)

        // We need to map back from safe keys to original keys
        // This is a bit inefficient but works for development purposes
        for (const file of files) {
          if (file.endsWith(".json")) {
            const safeKey = file.replace(".json", "")

            // Try to find the original key from our mapping
            let originalKey = safeKey
            for (const [mapKey, mapValue] of Object.entries(memoryStore)) {
              if (mapKey.startsWith("key_map:") && mapValue === safeKey) {
                originalKey = mapKey.replace("key_map:", "")
                break
              }
            }

            if (originalKey.startsWith(prefix)) {
              keys.push(originalKey)
            }
          }
        }
      } catch (error) {
        console.error("Error reading storage directory:", error)
      }
    }

    // Also check memory store
    for (const key in memoryStore) {
      if (key.startsWith(prefix) && !key.startsWith("key_map:") && !keys.includes(key)) {
        keys.push(key)
      }
    }

    return keys
  },
}


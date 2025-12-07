type MultiMediaContentPart = image | string

class MultiMediaMessage {
    role "user" | "assistant"
    content MultiMediaContentPart[]
}

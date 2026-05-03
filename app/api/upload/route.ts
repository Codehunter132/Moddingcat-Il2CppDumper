import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";


export async function POST(req: NextRequest) {
  try {
    const fileName = req.headers.get("x-file-name");
    const chunkIndex = parseInt(req.headers.get("x-chunk-index") || "0", 10);
    const totalChunks = parseInt(req.headers.get("x-total-chunks") || "1", 10);

    if (!fileName) {
      return NextResponse.json({ error: "Missing x-file-name header" }, { status: 400 });
    }

    // Read the chunk data
    const chunkData = await req.arrayBuffer();
    const buffer = Buffer.from(chunkData);

    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, fileName);

    // If it's the first chunk, overwrite the file. Otherwise append.
    if (chunkIndex === 0) {
      await fs.writeFile(filePath, buffer);
    } else {
      await fs.appendFile(filePath, buffer);
    }

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

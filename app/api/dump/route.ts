import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { binaryName, metadataName } = await req.json();

    if (!binaryName || !metadataName) {
      return NextResponse.json({ error: "Missing filenames" }, { status: 400 });
    }

    const tmpDir = os.tmpdir();
    const binaryPath = path.join(tmpDir, binaryName);
    const metadataPath = path.join(tmpDir, metadataName);
    const outputDir = path.join(tmpDir, `dump_out_${Date.now()}`);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Path to the compiled Linux native binary of rodroid-il2cppdumper
    // This expects the user to have compiled the cli.rs and placed `dumper-linux` in the root of the next.js project.
    const dumperBinary = path.join(process.cwd(), "dumper-linux");

    // Check if the binary exists
    try {
      await fs.access(dumperBinary);
    } catch {
      return NextResponse.json(
        { error: "Native dumper executable not found. Please compile the Rust CLI and place 'dumper-linux' in the project root." },
        { status: 500 }
      );
    }

    // Give execute permission
    await execAsync(`chmod +x ${dumperBinary}`);

    // Execute the dumper
    // The CLI wrapper will take arguments: <binary> <metadata> <output_dir>
    console.log("Starting dump...");
    const { stdout, stderr } = await execAsync(`${dumperBinary} "${binaryPath}" "${metadataPath}" "${outputDir}"`);
    console.log("Dump finished:", stdout);

    if (stderr) {
      console.warn("Dumper STDERR:", stderr);
    }

    // After dumping, read the generated dump.cs file
    const dumpCsPath = path.join(outputDir, "dump.cs");
    
    let dumpContent = "";
    try {
      dumpContent = await fs.readFile(dumpCsPath, "utf-8");
    } catch (e) {
      return NextResponse.json(
        { error: "dump.cs was not generated. Output: " + stdout },
        { status: 500 }
      );
    }

    // Clean up temporary files
    await fs.unlink(binaryPath).catch(() => {});
    await fs.unlink(metadataPath).catch(() => {});
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});

    return NextResponse.json({
      success: true,
      log: stdout,
      dumpCs: dumpContent,
    });
  } catch (error: any) {
    console.error("Dumping error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute dump" }, { status: 500 });
  }
}

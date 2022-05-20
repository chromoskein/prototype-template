import React, { useState, useEffect, useRef } from 'react';
import { GraphicsLibrary, Spheres } from "./modules/graphics-library/src/index";
import * as GraphicsModule from "./modules/graphics-library/src";
import './App.css';
import { vec3, vec4 } from 'gl-matrix';

import dataTime0 from '../data/time_0.xyz';

function normalizePoints(points: Array<vec3>): Array<vec3> {
  // Normalize
  let max = vec3.clone(points[0]);
  let min = vec3.clone(points[0]);
  for (const position of points) {
    max = vec3.max(max, max, position);
    min = vec3.min(min, min, position);
  }
  const center = vec3.scale(vec3.create(), vec3.add(vec3.create(), min, max), 0.5);

  const centeredPositions = points.map(p => vec3.sub(vec3.create(), p, center));

  max = vec3.sub(vec3.create(), max, center);
  min = vec3.sub(vec3.create(), min, center);

  const bbSizeLengthsVec3 = vec3.sub(vec3.create(), max, min);
  const bbSizeLengths = [Math.abs(bbSizeLengthsVec3[0]), Math.abs(bbSizeLengthsVec3[1]), Math.abs(bbSizeLengthsVec3[2])];

  const maxLength = Math.max(...bbSizeLengths);
  const scale = 1.0 / maxLength;

  return centeredPositions.map(p => vec3.scale(vec3.create(), p, scale));
}

export function App(): JSX.Element {
  const [adapter, setAdapter] = useState<GPUAdapter | null>(null);
  const [device, setDevice] = useState<GPUDevice | null>(null);
  const [deviceError, setDeviceError] = useState<GPUUncapturedErrorEvent | null>(null);
  const [graphicsLibrary, setGraphicsLibrary] = useState<GraphicsLibrary | null>(null);

  const canvasElement = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<GraphicsModule.Viewport3D | null>(null);

  //#region Adapter, Device, Library Initialization
  useEffect(() => {
    async function waitForAdapter() {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance",
      });

      setAdapter(adapter);
    }

    waitForAdapter();
  }, []);

  useEffect(() => {
    if (adapter == null) {
      return;
    }
    const waitForDevice = async function () {
      const device = await adapter.requestDevice({
        // requiredFeatures: ['timestamp-query']
      });
      device.onuncapturederror = (error: GPUUncapturedErrorEvent) => {
        setDeviceError(error);
      };

      setDeviceError(null);
      setDevice(device);
    }

    waitForDevice();
  }, [adapter]);

  useEffect(() => {
    if (adapter == null || device == null) {
      return;
    }

    setGraphicsLibrary(() => new GraphicsLibrary(adapter, device));
  }, [adapter, device]);
  //#endregion

  //#region Viewport Setup
  useEffect(() => {
    if (!graphicsLibrary || canvasElement == null || !canvasElement.current) return;

    const newViewport = graphicsLibrary.create3DViewport(canvasElement.current);
    setViewport(() => newViewport);

    // Draw the scene repeatedly
    const render = async (frametime: number) => {
      await newViewport.render(frametime);

      requestAnimationFrame(render);
    }
    const requestID = requestAnimationFrame(render);

    return function cleanup() {
      viewport?.deallocate();
      window.cancelAnimationFrame(requestID);
    };
  }, [graphicsLibrary, canvasElement]);
  //#endregion Viewport Setup

  //#region Load Data
  useEffect(() => {
    if (!viewport) return;

    fetch(dataTime0)
      .then(response => response.text()
        .then(data => {
          const positions = data.split(/\r?\n/).map(l => {
            const v = l.split(' ');

            return vec3.fromValues(parseFloat(v[1]), parseFloat(v[2]), parseFloat(v[3]));
          });

          const [spheresId, spheres] = viewport.scene.addSpheres("0", normalizePoints(positions), 0.1, null, false, true);
          spheres.radius = 0.004;
          viewport.scene.buildLowLevelStructure();
        })
      );

  }, [viewport]);
  //#endregion Load Data

  return (
    <canvas ref={canvasElement} style={{ width: '100%', height: '100%', overflow: 'hidden' }}></canvas>
  );
}
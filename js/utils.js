import * as THREE from 'three';

let seed = 7;
export const randNum= () => {
    seed = (seed * 16807) % 2147483647;
    return (seed -1)/2147483646;
}

export const smooth = (a,b,x) => {
    const t = Math.min(
        1, Math.max(0, (x-a)/(b-a))
    );
    return t*t*(3-2*t);
}

export function canvasTex(size, draw, {
    repeat = 1, color = false
} = {}) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t; 
}



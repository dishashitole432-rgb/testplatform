import { useCallback, useEffect, useRef, useState } from "react";
import { resolveImageUrl } from "../utils/imageUrl";

export default function QuestionImage({ imageUrl, alt = "Question illustration", compact = false }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const src = resolveImageUrl(imageUrl);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    resetView();
  }, [resetView]);

  const zoomBy = (delta) => {
    setScale((s) => Math.min(4, Math.max(1, Number((s + delta).toFixed(2)))));
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const onPointerDown = (e) => {
    if (scale <= 1) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    setOffset({
      x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (e.clientY - dragRef.current.startY),
    });
  };

  const onPointerUp = (e) => {
    dragRef.current.active = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.15 : -0.15);
  };

  if (!src) return null;

  return (
    <>
      <figure className={`questionImageFigure ${compact ? "compact" : ""}`}>
        <button type="button" className="questionImageTrigger" onClick={() => setOpen(true)} aria-label="Open image to zoom">
          <img src={src} alt={alt} className="questionImagePreview" />
          <span className="questionImageHint">Click to zoom</span>
        </button>
      </figure>

      {open && (
        <div className="imageZoomOverlay" onClick={close} role="presentation">
          <div
            className="imageZoomDialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Zoomed question image"
          >
            <div className="imageZoomToolbar">
              <button type="button" className="ghostButton" onClick={() => zoomBy(-0.25)} disabled={scale <= 1}>
                −
              </button>
              <span className="imageZoomLevel">{Math.round(scale * 100)}%</span>
              <button type="button" className="ghostButton" onClick={() => zoomBy(0.25)} disabled={scale >= 4}>
                +
              </button>
              <button type="button" className="ghostButton" onClick={resetView}>
                Reset
              </button>
              <button type="button" className="ghostButton" onClick={close}>
                Close
              </button>
            </div>
            <div className="imageZoomStage" onWheel={onWheel}>
              <img
                src={src}
                alt={alt}
                className="imageZoomImg"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                draggable={false}
              />
            </div>
            <p className="imageZoomHelp">Scroll to zoom · Drag to pan when zoomed in</p>
          </div>
        </div>
      )}
    </>
  );
}


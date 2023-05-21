

export class Gui {
  constructor({ listeners, parentDomElement }) {
    this.model = {
      initialAngle: 0,
      engine: "js-custom-alloc",
      pinCamera: false,
      showEllipsoids: true,
      showAxes: true,
      showVectors: true,
      benchmark: false,
    };
    this.listeners = listeners;

    this.datgui = new dat.GUI({ autoPlace: false });

    this.datgui.add(this.model, "engine", [
      "blazor",
      "js-custom-alloc",
      "js-custom-noalloc",
      "js-three-alloc",
      "js-three-noalloc",
    ])
      .name("Engine")
      .onFinishChange(value => this._fire("engine", value))
    ;
    this.datgui.add(this.model, "initialAngle", 0, 100, 1)
      .name("Initial Angle")
      .onFinishChange(value => this._fire("initialAngle", value))
    ;
    this.datgui.add(this.model, "pinCamera")
      .name("Pin Camera")
      .onFinishChange(value => this._fire("pinCamera", value))
    ;
    this.datgui.add(this.model, "showEllipsoids")
      .name("Show Ellipsoids")
      .onFinishChange(value => this._fire("showEllipsoids", value))
    ;
    this.datgui.add(this.model, "showAxes")
      .name("Show Axes")
      .onFinishChange(value => this._fire("showAxes", value))
    ;
    this.datgui.add(this.model, "showVectors")
      .name("Show Vectors")
      .onFinishChange(value => this._fire("showVectors", value))
    ;
    this.datgui.add(this.model, "benchmark")
      .name("Benchmark")
      .onFinishChange(value => this._fire("benchmark", value))
    ;

    parentDomElement.append(this.datgui.domElement);
  }

  _fire(property, newValue) {
    this.listeners?.[property]?.({ newValue });
  }
  destroy() {
    this.datgui.destroy();
  }
}

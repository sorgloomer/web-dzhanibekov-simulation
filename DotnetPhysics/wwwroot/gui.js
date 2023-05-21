export class Gui {
  constructor({ listeners, parentDomElement }) {
    this.model = {};
    this.listeners = listeners;

    this.datgui = new dat.GUI({ autoPlace: false });
    this.datgui.useLocalStorage = true; // doesn't seem to work
    this._load();

    this.datgui.add(this.model, "engine", [
      "blazor",
      "js-custom-alloc",
      "js-custom-noalloc",
      "js-three-alloc",
      "js-three-noalloc",
    ])
      .name("Engine")
      .onFinishChange(value => this._handleChange("engine", value))
    ;
    this.datgui.add(this.model, "stability", 0, 100, 1)
      .name("Stability")
      .onFinishChange(value => this._handleChange("stability", value))
    ;
    this.datgui.add(this.model, "pinCamera")
      .name("Pin Camera")
      .onFinishChange(value => this._handleChange("pinCamera", value))
    ;
    this.datgui.add(this.model, "showEllipsoids")
      .name("Show Ellipsoids")
      .onFinishChange(value => this._handleChange("showEllipsoids", value))
    ;
    this.datgui.add(this.model, "showAxes")
      .name("Show Axes")
      .onFinishChange(value => this._handleChange("showAxes", value))
    ;
    this.datgui.add(this.model, "showVectors")
      .name("Show Vectors")
      .onFinishChange(value => this._handleChange("showVectors", value))
    ;
    this.datgui.add(this.model, "benchmark")
      .name("Benchmark")
      .onFinishChange(value => this._handleChange("benchmark", value))
    ;
    this.dat

    parentDomElement.append(this.datgui.domElement);
  }

  destroy() {
    this.datgui.destroy();
  }

  _handleChange(property, newValue) {
    this._store();
    this.listeners?.[property]?.({ newValue });
  }

  _load() {
    const result = {
      stability: 1,
      engine: "js-custom-alloc",
      pinCamera: false,
      showEllipsoids: true,
      showAxes: true,
      showVectors: true,
      benchmark: false,
    };
    try {
      const optstr = window?.localStorage?.getItem?.("options");
      const stored = optstr ? JSON.parse(optstr) : undefined;
      if (stored !== undefined) {
        Object.assign(result, stored);
      }
    } catch (e) {
      console.error(e);
    }
    Object.assign(this.model, result);
  }

  _store() {
    window?.localStorage?.setItem?.("options", JSON.stringify(this.model));
  }
}

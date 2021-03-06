(function() {
  var ObjectId, Schema, addSchemaField, addSchemaSubField, defaults, extend, filePlugin, fs, is_callable, make_upload_to_model, mkdirp, mongoose, path;

  mongoose = require('mongoose');

  path = require('path');

  fs = require('fs');

  mkdirp = require('mkdirp');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  extend = function(dst, src) {
    var key, val;
    for (key in src) {
      val = src[key];
      dst[key] = val;
    }
    return dst;
  };

  defaults = function(dst, src) {
    var key, val;
    for (key in src) {
      val = src[key];
      if (!(key in dst)) {
        dst[key] = val;
      }
    }
    return dst;
  };

  addSchemaField = function(schema, pathname, fieldSpec) {
    var fieldSchema;
    fieldSchema = {};
    fieldSchema[pathname] = fieldSpec;
    return schema.add(fieldSchema);
  };

  addSchemaSubField = function(schema, masterPathname, subName, fieldSpec) {
    return addSchemaField(schema, "" + masterPathname + "." + subName, fieldSpec);
  };

  is_callable = function(f) {
    return typeof f === 'function';
  };

  filePlugin = function(schema, options) {
    var onChangeCb, pathname, relative_to, upload_to;
    if (options == null) {
      options = {};
    }
    pathname = options.name || 'file';
    onChangeCb = options.change_cb || null;
    upload_to = options.upload_to || null;
    relative_to = options.relative_to || null;
    addSchemaField(schema, pathname, {});
    addSchemaSubField(schema, pathname, 'name', {
      type: String,
      "default": function() {
        return null;
      }
    });
    addSchemaSubField(schema, pathname, 'path', {
      type: String,
      "default": function() {
        return null;
      }
    });
    addSchemaSubField(schema, pathname, 'rel', {
      type: String,
      "default": function() {
        return null;
      }
    });
    addSchemaSubField(schema, pathname, 'type', {
      type: String,
      "default": function() {
        return null;
      }
    });
    addSchemaSubField(schema, pathname, 'size', {
      type: Number,
      "default": function() {
        return null;
      }
    });
    addSchemaSubField(schema, pathname, 'lastModified', {
      type: Date,
      "default": function() {
        return null;
      }
    });
    schema.virtual("" + pathname + ".file").set(function(fileObj) {
      var dst, dst_dirname, err, rel, rs, u_path, ws;
      u_path = fileObj.path;
      if (upload_to) {
        if (is_callable(upload_to)) {
          dst = upload_to.call(this, fileObj);
        } else {
          dst = path.join(upload_to, fileObj.name);
        }
        dst_dirname = path.dirname(dst);
        mkdirp.sync(dst_dirname);
        try {
          fs.renameSync(u_path, dst);
        } catch (_error) {
          err = _error;
          rs = fs.createReadStream(u_path);
          ws = fs.createWriteStream(dst);
          rs.pipe(ws);
          rs.on('end', function() {
            return fs.unlink(u_path, function(err) {
              if (err) {
                throw err;
              }
            });
          });
        }
        console.log("moved from " + u_path + " to " + dst);
        rel = dst;
        if (relative_to) {
          if (is_callable(relative_to)) {
            rel = relative_to.call(this, fileObj);
          } else {
            rel = path.relative(relative_to, dst);
          }
        }
        this.set("" + pathname + ".name", fileObj.name);
        this.set("" + pathname + ".path", dst);
        this.set("" + pathname + ".rel", rel);
        this.set("" + pathname + ".type", fileObj.type);
        this.set("" + pathname + ".size", fileObj.size);
        this.set("" + pathname + ".lastModified", fileObj.lastModifiedDate);
        return this.markModified(pathname);
      } else {
        dst = u_path;
        rel = dst;
        if (relative_to) {
          if (is_callable(relative_to)) {
            rel = relative_to.call(this, fileObj);
          } else {
            rel = path.relative(relative_to, dst);
          }
        }
        this.set("" + pathname + ".name", fileObj.name);
        this.set("" + pathname + ".path", dst);
        this.set("" + pathname + ".rel", rel);
        this.set("" + pathname + ".type", fileObj.type);
        this.set("" + pathname + ".size", fileObj.size);
        this.set("" + pathname + ".lastModified", fileObj.lastModifiedDate);
        return this.markModified(pathname);
      }
    });
    return schema.pre('set', function(next, path, val, typel) {
      var oldValue;
      if (path === ("" + pathname + ".path")) {
        if (onChangeCb) {
          oldValue = this.get("" + pathname + ".path");
          console.log("old: " + oldValue + " new: " + val);
          onChangeCb.call(this, pathname, val, oldValue);
        }
      }
      return next();
    });
  };

  make_upload_to_model = function(basedir, subdir) {
    var b_dir, s_dir, upload_to_model;
    b_dir = basedir;
    s_dir = subdir;
    upload_to_model = function(fileObj) {
      var dstdir, id;
      dstdir = b_dir;
      if (s_dir) {
        dstdir = path.join(dstdir, s_dir);
      }
      id = this.get('id');
      if (id) {
        dstdir = path.join(dstdir, "" + id);
      }
      return path.join(dstdir, fileObj.name);
    };
    return upload_to_model;
  };

  module.exports = {
    filePlugin: filePlugin,
    make_upload_to_model: make_upload_to_model
  };

}).call(this);

var searchIndex = {};
searchIndex['bench'] = {"items":[[0,"","bench","",null,null]],"paths":[]};
searchIndex['crossbeam'] = {"items":[[0,"","crossbeam","Support for concurrent and parallel programming.",null,null],[3,"Scope","","",null,null],[3,"ScopedJoinHandle","","",null,null],[5,"scope","","",null,{"inputs":[{"name":"f"}],"output":{"name":"r"}}],[5,"spawn_unsafe","","Like `std::thread::spawn`, but without the closure bounds.",null,{"inputs":[{"name":"f"}],"output":{"name":"joinhandle"}}],[0,"mem","","Memory management for concurrent data structures",null,null],[3,"CachePadded","crossbeam::mem","Pad `T` to the length of a cacheline.",null,null],[0,"epoch","","Epoch-based memory management",null,null],[3,"Owned","crossbeam::mem::epoch","Like `Box<T>`: an owned, heap-allocated data value of type `T`.",null,null],[3,"Shared","","Like `&'a T`: a shared reference valid for lifetime `'a`.",null,null],[3,"Atomic","","Like `std::sync::atomic::AtomicPtr`.",null,null],[3,"Guard","","An RAII-style guard for pinning the current epoch.",null,null],[5,"pin","","Pin the current epoch.",null,{"inputs":[],"output":{"name":"guard"}}],[11,"new","","Move `t` to a new heap allocation.",0,{"inputs":[{"name":"owned"},{"name":"t"}],"output":{"name":"owned"}}],[11,"deref","","",0,{"inputs":[{"name":"owned"}],"output":{"name":"t"}}],[11,"deref_mut","","",0,{"inputs":[{"name":"owned"}],"output":{"name":"t"}}],[11,"eq","","",1,{"inputs":[{"name":"shared"},{"name":"shared"}],"output":{"name":"bool"}}],[11,"ne","","",1,{"inputs":[{"name":"shared"},{"name":"shared"}],"output":{"name":"bool"}}],[11,"clone","","",1,{"inputs":[{"name":"shared"}],"output":{"name":"shared"}}],[11,"deref","","",1,{"inputs":[{"name":"shared"}],"output":{"name":"t"}}],[11,"default","","",2,{"inputs":[{"name":"atomic"}],"output":{"name":"atomic"}}],[11,"null","","Create a new, null atomic pointer.",2,{"inputs":[{"name":"atomic"}],"output":{"name":"atomic"}}],[11,"load","","Do an atomic load with the given memory ordering.",2,{"inputs":[{"name":"atomic"},{"name":"ordering"},{"name":"guard"}],"output":{"name":"option"}}],[11,"store","","Do an atomic store with the given memory ordering.",2,{"inputs":[{"name":"atomic"},{"name":"option"},{"name":"ordering"}],"output":null}],[11,"store_and_ref","","Do an atomic store with the given memory ordering, immediately yielding\na shared reference to the pointer that was stored.",2,{"inputs":[{"name":"atomic"},{"name":"owned"},{"name":"ordering"},{"name":"guard"}],"output":{"name":"shared"}}],[11,"store_shared","","Do an atomic store of a `Shared` pointer with the given memory ordering.",2,{"inputs":[{"name":"atomic"},{"name":"option"},{"name":"ordering"}],"output":null}],[11,"cas","","Do a compare-and-set from a `Shared` to an `Owned` pointer with the\ngiven memory ordering.",2,{"inputs":[{"name":"atomic"},{"name":"option"},{"name":"option"},{"name":"ordering"}],"output":{"name":"result"}}],[11,"cas_and_ref","","Do a compare-and-set from a `Shared` to an `Owned` pointer with the\ngiven memory ordering, immediatley acquiring a new `Shared` reference to\nthe previously-owned pointer if successful.",2,{"inputs":[{"name":"atomic"},{"name":"option"},{"name":"owned"},{"name":"ordering"},{"name":"guard"}],"output":{"name":"result"}}],[11,"cas_shared","","Do a compare-and-set from a `Shared` to another `Shared` pointer with\nthe given memory ordering.",2,{"inputs":[{"name":"atomic"},{"name":"option"},{"name":"option"},{"name":"ordering"}],"output":{"name":"bool"}}],[11,"swap","","Do an atomic swap with an `Owned` pointer with the given memory ordering.",2,{"inputs":[{"name":"atomic"},{"name":"option"},{"name":"ordering"},{"name":"guard"}],"output":{"name":"option"}}],[11,"swap_shared","","Do an atomic swap with a `Shared` pointer with the given memory ordering.",2,{"inputs":[{"name":"atomic"},{"name":"option"},{"name":"ordering"},{"name":"guard"}],"output":{"name":"option"}}],[11,"unlinked","","Assert that the value is no longer reachable from a lock-free data\nstructure and should be collected when sufficient epochs have passed.",3,{"inputs":[{"name":"guard"},{"name":"shared"}],"output":null}],[11,"try_collect","","Attempt a garbage collection; returns `true` if successful.",3,{"inputs":[{"name":"guard"}],"output":{"name":"bool"}}],[11,"migrate_garbage","","Move the thread-local garbage into the global set of garbage.",3,{"inputs":[{"name":"guard"}],"output":null}],[11,"drop","","",3,{"inputs":[{"name":"guard"}],"output":null}],[11,"zeroed","crossbeam::mem","A const fn equivalent to mem::zeroed().",4,{"inputs":[{"name":"cachepadded"}],"output":{"name":"cachepadded"}}],[11,"new","","Wrap `t` with cacheline padding.",4,{"inputs":[{"name":"cachepadded"},{"name":"t"}],"output":{"name":"cachepadded"}}],[11,"deref","","",4,{"inputs":[{"name":"cachepadded"}],"output":{"name":"t"}}],[11,"deref_mut","","",4,{"inputs":[{"name":"cachepadded"}],"output":{"name":"t"}}],[0,"sync","crossbeam","",null,null],[3,"MsQueue","crossbeam::sync","A Michael-Scott lock-free queue.",null,null],[3,"AtomicOption","","",null,null],[3,"TreiberStack","","Treiber's lock-free stack.",null,null],[3,"SegQueue","","A Michael-Scott queue that allocates \"segments\" (arrays of nodes)\nfor efficiency.",null,null],[11,"new","","",5,{"inputs":[{"name":"atomicoption"}],"output":{"name":"atomicoption"}}],[11,"swap_box","","",5,{"inputs":[{"name":"atomicoption"},{"name":"box"},{"name":"ordering"}],"output":{"name":"option"}}],[11,"swap","","",5,{"inputs":[{"name":"atomicoption"},{"name":"t"},{"name":"ordering"}],"output":{"name":"option"}}],[11,"take","","",5,{"inputs":[{"name":"atomicoption"},{"name":"ordering"}],"output":{"name":"option"}}],[11,"new","","Create a enw, emtpy queue.",6,{"inputs":[{"name":"msqueue"}],"output":{"name":"msqueue"}}],[11,"push","","Add `t` to the back of the queue.",6,{"inputs":[{"name":"msqueue"},{"name":"t"}],"output":null}],[11,"pop","","Attempt to dequeue from the front.",6,{"inputs":[{"name":"msqueue"}],"output":{"name":"option"}}],[11,"new","","Crate a new, empty stack.",7,{"inputs":[{"name":"treiberstack"}],"output":{"name":"treiberstack"}}],[11,"push","","Push `t` on top of the stack.",7,{"inputs":[{"name":"treiberstack"},{"name":"t"}],"output":null}],[11,"pop","","Attempt to pop the top element of the stack.",7,{"inputs":[{"name":"treiberstack"}],"output":{"name":"option"}}],[11,"new","","Create a enw, emtpy queue.",8,{"inputs":[{"name":"segqueue"}],"output":{"name":"segqueue"}}],[11,"push","","Add `t` to the back of the queue.",8,{"inputs":[{"name":"segqueue"},{"name":"t"}],"output":null}],[11,"pop","","Attempt to dequeue from the front.",8,{"inputs":[{"name":"segqueue"}],"output":{"name":"option"}}],[11,"defer","crossbeam","",9,{"inputs":[{"name":"scope"},{"name":"f"}],"output":null}],[11,"spawn","","",9,{"inputs":[{"name":"scope"},{"name":"f"}],"output":{"name":"scopedjoinhandle"}}],[11,"join","","",10,{"inputs":[{"name":"scopedjoinhandle"}],"output":{"name":"t"}}],[11,"thread","","",10,{"inputs":[{"name":"scopedjoinhandle"}],"output":{"name":"thread"}}],[11,"drop","","",9,{"inputs":[{"name":"scope"}],"output":null}]],"paths":[[3,"Owned"],[3,"Shared"],[3,"Atomic"],[3,"Guard"],[3,"CachePadded"],[3,"AtomicOption"],[3,"MsQueue"],[3,"TreiberStack"],[3,"SegQueue"],[3,"Scope"],[3,"ScopedJoinHandle"]]};
initSearch(searchIndex);